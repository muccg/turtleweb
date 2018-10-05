from django.utils.timezone import is_naive

from tastypie.resources import Serializer

__all__ = ["BetterSerializer"]


class BetterSerializer(Serializer):
    """
    Our own serializer to format datetimes in ISO 8601 but with timezone
    offset. Courtesy of
    http://www.tryolabs.com/Blog/2013/03/16/displaying-timezone-aware-dates-tastypie/
    """

    def format_datetime(self, data):
        # If naive or rfc-2822, default behavior...
        if is_naive(data) or self.datetime_formatting == 'rfc-2822':
            return super(BetterSerializer, self).format_datetime(data)
        return data.isoformat()
