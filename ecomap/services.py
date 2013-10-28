from models import *


class RecycleSpotService():
    @staticmethod
    def get_by_types(params):
        if 'types' not in params or len(params.getlist('types'))==0:
            return RecycleSpot.objects.all()

        # check if the provided types are valid
        if RecycleSpot.check_type(*types) > 0:
            raise Exception("Invalid recycle spot type")
        
        return RecycleSpot.objects.filter(type__in=types)


class RecyclableItemService():
    def get_all(self):
        return RecyclableItem.objects.all()
