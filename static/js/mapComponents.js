/**
 * Export
 */
var geoServices;
var PopupAddNew;
var AddressSearch;

(function(gMap) {
    /**
     * Location, Camera, Panorama, User detection... all the services
     */
    geoServices = {
        panorama: new gMap.StreetViewService(),
        coder: new gMap.Geocoder(),
        map: {
            /**
             * Get dimensions in coordinates difference
             * @returns {{height: number, width: number}}
             */
            getDimensions: function(map) {
                var mapBounds = map.getBounds();
                var latDiff = mapBounds.getNorthEast().lat() - mapBounds.getSouthWest().lat();
                var lngDiff = mapBounds.getNorthEast().lng() - mapBounds.getSouthWest().lng();
                return {
                    height: latDiff,
                    width: lngDiff
                }
            },
            /**
             * Get a location on the map relative to the bounds by proportion of the map size (in percentages)
             * @returns {{height: number, width: number}}
             */
            getProportionallyRelativeLocation: function(map, offset) {
                var defaultOffset = {
                    top: 50,
                    left:50
                }
                offset = offset || defaultOffset;
                var mapDim = geoServices.map.getDimensions(map)
                var mapBounds = map.getBounds();
                var latBase = null;
                var latPercentage = null;
                var lngBase = null;
                var lngPercentage = null;
                if (offset.bottom) {
                    latBase = mapBounds.getSouthWest().lat();
                    latPercentage = offset.bottom;
                } else {
                    latBase = mapBounds.getNorthEast().lat();
                    latPercentage = offset.top;
                }
                if (offset.left) {
                    lngBase = mapBounds.getSouthWest().lng();
                    lngPercentage = offset.left;
                } else {
                    lngBase = mapBounds.getNorthEast().lng();
                    lngPercentage = offset.right;
                }
                return new gMap.LatLng(latBase + mapDim.height*(latPercentage/100), lngBase + mapDim.width*(lngPercentage/100));
            }
        },
        human: {
            /**
             * Fetch coordinates of the user via WC3 geolocation service
             * @param callback
             */
            detectUser: function(callback){
                if (false) {//navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(loc){
                        callback({
                            lat: loc.coords.latitude,
                            lng: loc.coords.longitude
                        })
                    }, function() {
                        callback();
                    });
                } else {
                    callback();
                }
            },
            /**
             * Get address based on coordinates
             *
             * @param latLng
             * @param callback In the form callback(err, data )
             */
            convertToAddress: function(latLng, callback) {
                geoServices.coder.geocode({
                    "latLng": latLng
                }, function (results, status) {
                    if (status == gMap.GeocoderStatus.OK) {
                        var address = {
                            full: results[0]['formatted_address'],
                            city: null
                        }
                        $.each(results, function(i, token) {
                            if ($.inArray('locality', token.types)>-1) {
                                address.city = token.formatted_address
                                return false;
                            }
                        })
                        callback(null, address);
                    } else {
                        callback(status, results);
                    }
                });
            },
            /**
             * Clean address from tokens
             *
             * @param address
             * @param tokens
             */
            cleanAddress: function(address, tokens) {
                var cleanAddress = [];
                $.each(address.split(','), function(i, cityPart) {
                if ($.inArray($.trim(cityPart), tokens)==-1)
                    cleanAddress.push(cityPart)
                })
                return cleanAddress.join(', ')
            }
        }
    }

    /**
     * Popup dialogue used for submitting a new recycling spot
     *
     * @param options
     * @param callback
     * @constructor
     */
    PopupAddNew = function(options, callback) {
        var o = $.extend({
            addressInputSelector: ".floater div.add-new .new-address",
            map: undefined,
            location: undefined,
            content: "Heyyy!",
            geo: undefined
        }, options);

        var _self = this;
        _self.map = o.map;
        _self.geo = o.geo;
        var locationLookUp = $.Deferred();
        if (!o.location) {
            o.location = _self.geo.map.getProportionallyRelativeLocation(_self.map, {bottom: 10, left:50})
            _self.geo.panorama.getPanoramaByLocation(o.location, 500, function(result, status) {
                if (status == gMap.StreetViewStatus.OK) {
                    o.location = result.location.latLng
                }

                locationLookUp.resolve()
            });
        } else {
            locationLookUp.resolve()
        }
        locationLookUp.then(function() {
            _self.marker = _self._createMarker(o.location);
            _self.infowindow = _self._createInfoWindow({"content": o.content})
            _self.marker.setVisible(true);
            _self.infowindow.open(_self.map, _self.marker);
            _self.map.setOptions({draggableCursor: 'pointer'});
            _self.$elements = {}
            _self.events = {
                infoWindowReady: gMap.event.addListener(_self.infowindow, 'domready', function() {
                    var $content = $('#add-new');
                    _self.$elements.streetview = $content.find('.streetview')
                    _self.$elements.streetviewCancelTrigger = $content.find('#step1 a.close');
                    _self.$elements.step1DoneTrigger = $content.find('#step1 a.accept');
                    _self.$elements.streetviewCancelled = $content.find('.cancelled-streetview');
                    $content.find('a.address-focus').click(function(e) {
                        e.preventDefault();
                        $(o.addressInputSelector).focus();
                    });
                    _self.$elements.streetviewCancelTrigger.click(function(e) {
                        e.preventDefault();
                        _self._cancelStreetView()
                    })
                    _self.$elements.step1DoneTrigger.click(function(e){
                        e.preventDefault();
                        var $step2img  =  $('#step2 .street img');
                        var pov = _self.streetview.getPov()
                        var loc = _self.marker.getPosition()
                        var values=[120, 90, 53.5, 28.3, 14.3, 10];
                        var fov=values[Math.round(pov.zoom)];
                        var src = 'http://maps.googleapis.com/maps/api/streetview?size='+$step2img.width()+'x'+$step2img.height()+'&location='+loc.lat()+','+loc.lng()+'&fov='+fov+'&heading='+pov.heading+'&pitch'+pov.pitch+'&sensor=false';
                        $step2img.attr('src', src)
                        _self.infowindow.switchContent($content, $('#step1'), $('#step2'), 100)
                        _self.map.setOptions({draggableCursor: 'url(https://maps.gstatic.com/mapfiles/openhand_8_8.cur),default'});
                        _self.marker.setOptions({cursor: 'url(https://maps.gstatic.com/mapfiles/openhand_8_8.cur),default'});
                        _self.marker.setDraggable(false);
                        gMap.event.removeListener(_self.events.mapClick);
                    })
                    _self.$elements.streetviewHolding = $('#add-new .missing-streetview')
                    _self.streetview = _self._createStreetView(_self.$elements.streetview.get(0));
                    _self.streetview.bindTo("position", _self.marker);
                    _self.checkStreetView(_self.marker.getPosition());
                }),
                infoClose: gMap.event.addListener(_self.infowindow, 'closeclick', function() {
                    _self.map.setOptions({draggableCursor: 'url(https://maps.gstatic.com/mapfiles/openhand_8_8.cur),default'});
                    _self.destroy();
                }),
                markerDrag: gMap.event.addListener(_self.marker, "dragend", function () {
                    _self.checkStreetView(_self.marker.getPosition());
                    console.log(_self.streetview.getPhotographerPov())
                    console.log(_self.streetview.getPov())
                    console.log(_self.streetview.getZoom())
                }),
                mapClick: gMap.event.addListener(_self.map, 'click', function (event) {
                    //this is how we access the streetview params _self.streetview.pov
                    _self._animateMarker(event.latLng, function () {
                        _self.checkStreetView(_self.marker.getPosition());
        //                console.log(_self.marker.getPosition().toUrlValue(), _self.marker.getPosition())
                    });
                })
            }
            callback();
        })
    }
    PopupAddNew.prototype = {
        map: null,
        marker: null,
        infowindow: null,
        streetview: null,
        geo: null,
        events: null,
        $elements: null,
        /**
         * Add a marker
         * @param location LatLng location
         * @param options (optional)
         */
        _createMarker: function(location, options) {
            var _self = this;
            var options = $.extend({
                visible: false,
                position: location,
                animation: gMap.Animation.b,
                draggable: true,
                icon: {
                    url: '/img/pointer.png',
                    size: new gMap.Size(64, 64),
                    // The origin for this image is 0,0.
                    origin: new gMap.Point(0, 0),
                    // The anchor for this image is the base of the flagpole at 0,32.
                    anchor: new gMap.Point(23, 63)
                },
                map: _self.map
            }, options)
            return new gMap.Marker(options);
        },
        /**
         * Creates an infowindow
         *
         * @param options Infowindow options
         * @returns {gMap.InfoWindow}
         * @private
         */
        _createInfoWindow: function(options) {
            var options = $.extend({
			pixelOffset: new google.maps.Size(-165, 0)
			,zIndex: null
//			,alignBottom: true
			,boxStyle: {
			  background: "transparent url('/img/532px-TriangleArrow-Up.png') no-repeat center top"
			  ,width: "330px"
			 }
			,closeBoxMargin: "10px 2px 2px 2px"
			,closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif"
			,infoBoxClearance: new google.maps.Size(1, 1)
			,pane: "floatPane"
			,enableEventPropagation: false
		}

        , options)
            console.log('asdasd')
            var infoWindow = new InfoBoxAnimated(options);
//            var options = $.extend({}, options)
//            var infoWindow = new gMap.InfoWindow(options);
            return infoWindow;
        },
        /**
         * Cancels streetview picker
         * @private
         */
        _cancelStreetView: function() {
            var _self = this;
            if (_self.$elements.streetviewCancelled.is(':visible')) return;
            _self.$elements.streetviewHolding.hide();
            _self.$elements.streetview.hide();
            _self.streetview.setVisible(false);
            _self.$elements.streetviewCancelled.show();
        },
        /**
         * Creates a streetview obj
         *
         * @param el DOM el
         * @param options
         * @returns {gMap.StreetViewPanorama}
         * @private
         */
        _createStreetView: function(el, options) {
            var options = $.extend({
                navigationControl: false,
                enableCloseButton: false,
                addressControl: false,
                linksControl: false
            }, options)
            return new gMap.StreetViewPanorama(el, options);
        },
        /**
         * Move marker smoothly
         * @param location
         * @param callback
         * @private
         */
        _animateMarker: function(location, callback) {
            this.marker.animateTo(location, {
                easing: "easeOutCubic",
                duration: 300,
                complete: callback
            });
        },
        /**
         * Check if streetview is out of range
         * @param location LatLng
         */
        checkStreetView: function(location){
            var _self = this;
            _self.geo.panorama.getPanoramaByLocation(location, 50, function(result, status) {
                _self.$elements.streetviewCancelled.hide()
                if (status == gMap.StreetViewStatus.OK) {
                    _self.$elements.streetview.show();
                    _self.streetview.setVisible(true);
                    _self.$elements.streetviewHolding.hide();
                } else {
                    _self.$elements.streetview.hide();
                    _self.streetview.setVisible(false);
                    _self.$elements.streetviewHolding.show()
                }
            });
        },
        /**
         * Clean after the popup is not in use
         */
        destroy: function() {
            var _self = this;
            gMap.event.removeListener(_self.events.markerDrag);
            gMap.event.removeListener(_self.events.mapClick);
            gMap.event.removeListener(_self.events.infoWindowReady);
            gMap.event.removeListener(_self.events.infoClose);
            if (_self.infowindow.getMap() instanceof gMap.Map)
                _self.infowindow.close()
            _self.streetview.unbind("position");;
            _self.marker.setMap(null);
        }
    }

    /**
     * Places autocomplete
     * @param $el
     * @param map
     * @constructor
     */
    AddressSearch = function($el, map) {
        var _self = this;
        _self.events = {};
        _self.map = map;
        _self.$el = $el;
        var options = {
            types: ['geocode'],
            componentRestrictions: {country: 'BG'}
        };
        _self.autocomplete = new gMap.places.Autocomplete($el.get(0), options);
        _self.autocomplete.bindTo('bounds', map);
        _self.events.autocompleteChange = gMap.event.addListener(_self.autocomplete, 'place_changed', function() {
            $el.removeClass('notfound');
            var place = _self.autocomplete.getPlace();
            // Inform the user if the place was not found.
            if (!place.geometry) {
                $el.addClass('notfound')
                console.log('notfound')
                return;
            }
            // If the place has a geometry, then present it on a map.
            if (place.geometry.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else {
                map.setCenter(place.geometry.location);
                map.setZoom(17);  // Why 17? Because it looks good.
            }
            // Ahmm?... building up address from address components instead of formatted_address?
            if (place.address_components) {
    //            console.log([
    //                (place.address_components[0] && place.address_components[0].short_name || ''),
    //                (place.address_components[1] && place.address_components[1].short_name || ''),
    //                (place.address_components[2] && place.address_components[2].short_name || '')
    //            ].join(' '));
            }
            //@todo ajax query for new points
        })
    }
    AddressSearch.prototype = {
        $el: null,
        map: null,
        autocomplete: null,
        destroy: function() {
            var _self = this;
            _self.autocomplete.unbind("bounds");
            gMap.event.removeListener(_self.events.autocompleteChange);
        }
    }
})(google.maps)