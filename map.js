        ymaps.ready(init);
 
        function init () {
            var myMap = new ymaps.Map('map', {
                    center: [44.96, 34.11], 
                    zoom: 11
                });
				 myMap.options.set('scrollZoomSpeed', 1);
        }