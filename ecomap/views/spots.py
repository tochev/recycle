from django.template.response import TemplateResponse
from django.views.generic.base import View
from django.http import HttpResponse

from core.exception.verbose import VerboseRedirectException
from ecomap.services import *

import logging

class RecycleSpotsView(View):
    def get(self, request):
        return TemplateResponse(request, 'spots/get', {
            'spots': RecycleSpotService.get_by_types(request.params.getlist('test'))
        })

    def put(self, request):
        
        response = {}
        try:
            RecycleSpot.add_spot(request.PUT)
            response['status'] = 201
            response['content'] = '{"status": "OK"}'
        except:
            response['status'] = 400
            response['content'] = '{"status": "Error"}'

        return HttpResponse(content_type = "application/json", **response)
        # ...nothing happens here yet, test redirection with errors...
       # failure = VerboseRedirectException('Unable to change home page').set_redirect('home')
        # ...processing changes on home page...
        # Ooops, an error occurred
        #raise failure.add_error('sidebar', 'Your chosen sidebar widgets are unavailable')

