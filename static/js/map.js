var Map = function()
{
	var _self = this;
	_self.map = new google.maps.Map(document.getElementById('map-canvas'),  { 
		zoom: 12,
        minZoom: 7,
        center: new google.maps.LatLng(42.693413, 23.322601),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [
                    { visibility: "off" }
                ]
            }
        ]});
	
	var html = '<div id="add-new">' +
					'Тука ще е първа стъпка от Wizard-а за добавяне' +
					'<div id="step1">' +
						'<div id="streetview">' +
						'</div>' +
					'</div>' +
				'</div>';

	_self.infowindow = new google.maps.InfoWindow({
		content: html
	});
	
	_self.streetview = null;

	google.maps.event.addListener(infowindow, 'domready', function () {
        _self.streetview = new google.maps.StreetViewPanorama(document.getElementById("streetview"), {
            navigationControl: true,
            navigationControlOptions: {style: google.maps.NavigationControlStyle.ANDROID},
            enableCloseButton: false,
            addressControl: false,
            linksControl: false
        });
        _self.streetview.bindTo("position", _self.marker);
        _self.streetview.setVisible(true);
    });

    google.maps.event.addListener(infowindow, 'closeclick', function () {
        _self.streetview.unbind("position");
        _self.streetview.setVisible(false);
        _self.streetview = null;
    });
	
	_self.marker = null;
	_self.add_marker = function(location)
	{
        if (_self.marker != null) 
		{
            _self.marker.animateTo(location, {
                easing: "easeOutCubic",
                duration: 300
            });
            return;
        }
        _self.marker = new google.maps.Marker({
            position: location,
            animation: google.maps.Animation.b,
            draggable: true,
//            title: "My new marker",
            icon: {
                url: '/img/pointer.png',
                size: new google.maps.Size(64, 64),
                // The origin for this image is 0,0.
                origin: new google.maps.Point(0, 0),
                // The anchor for this image is the base of the flagpole at 0,32.
                anchor: new google.maps.Point(23, 63)
            },
            map: _self.map
        });

        setTimeout(function () 
		{
 			infowindow.open(_self.map, _self.marker);
        }, 200);
	}

	google.maps.event.addListener(_self.map, 'click', function (event) 
	{
	    _self.add_marker(event.latLng);
		//this is how we access the streetview params
		if(_self.streetview != null)
		{
			console.log(_self.streetview.pov);
		}
		if(_self.marker != null)
		{
			console.log(_self.marker.getPosition().toUrlValue())
		}
		
	});

}

google.maps.event.addDomListener(window, 'load', Map);

$(function () {
    var $triggerAddNew = $('.floater a.add-new');

    // Once the "Add new spot" mode has been activated
    $triggerAddNew.click(function () {
        map.setOptions({draggableCursor: 'pointer'});
    })

    var $filter = $('.floater select');
    var $filterForm = $filter.closest('form');
    $filter.select2({
    })

    var spotInfoWindow = new google.maps.InfoWindow();
    var recyclables = $filter.data('recyclables');
    $filter.change(function (e) {
        var tags = []
        $.each(e.val, function (i, tag) {
            tag = recyclables[tag]
            if ($.inArray(tag, tags) == -1) tags.push(tag)
        });
        $.get($filterForm.data('action'), {'tags': tags}, function (data) {
            console.log(data)
            var marker;
            $.each(data, function(i, loc) {
                marker = new google.maps.Marker({
                    position: new google.maps.LatLng(loc.lat, loc.lng),
                    animation: google.maps.Animation.b,
                    draggable: true,
                    map: map
                });
//                google.maps.event.addListener(marker, 'click', (function (marker, i) {
//                    return function () {
//                        spotInfoWindow.setContent(locations[i][0]);
//                        spotInfoWindow.open(map, marker);
//                    }
//                })(marker, i));
            })
        }, 'json')
    })
})
