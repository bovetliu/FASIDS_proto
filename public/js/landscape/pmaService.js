

//////////////////////SERVICE MODULE///////////////////////////////////////////////////////////////////////

// pmaServices module
var pmaServices = angular.module("pmaServices", ['polygonManagerApp']).factory("mapRelatedService", function pmaServiceFactoryFn(stateService){
  /*beginning of normal file */
  var mapcover = initMapCover( 'mapcover', 'mapcover-map' ,{
    draggingCursor:"move",
    draggableCursor:"auto",
    center: {lat: 30.62060000, lng: -96.32621},
    zoom: 16,
    zoomControl:false,    //left side
    panControl:false,     //left top corner: 
    tilt:0,
    // mapTypeControl:false  //right top corner: "map|satellite"
    mapTypeControlOptions: {
      // style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT
    }
  });
  var temp_startmarker = new google.maps.Marker({  // used to mark head of path drawing
    icon:{
      path: google.maps.SymbolPath.CIRCLE,
      scale: 3,
      strokeColor:'#FF0000'
    }
  });
  var gmap = mapcover.model.get("map");

  var drawingPath = new google.maps.Polyline({
    path: [],
    geodesic: false,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    map: gmap
  });
  // handling polygon drawing
  gmap.addListener('click', function mapClkCb (event){
    if (stateService.getStatus() === "polygondrawing"){
      drawingPath.getPath().push(event.latLng)
      if (drawingPath.getPath().getLength() === 1){
        temp_startmarker.setPosition(event.latLng);
        temp_startmarker.setMap(gmap);
      }
    }
  });

  temp_startmarker.addListener('click',function onTempStartMarkerClicked(){
    if ( stateService.getStatus() === 'polygondrawing' || stateService.getStatus() === 'arearemoving') {
      var statusReserved = stateService.getStatus();
      stateService.setStatus(null);
      stateService.setStatus(statusReserved);
    }
  });
  return {
    mapcover: mapcover,
    gmap: gmap,
    geocoder: new google.maps.Geocoder(),
    temp_startmarker: temp_startmarker,
    drawingPath: drawingPath,
    spherical: google.maps.geometry.spherical,
    activePolygon: null,
    saved_polygons: [],
    polygons:[],
    isOnlyOnePolygon: function() {
      return this.polygons.length === 1;
    }
  };
})
.factory("mapRelatedFunctionsService", function (){
  function setActive(toBeActivatedPolygon, mapRelatedService, stateService) {
    // shapeEditing and treatmentSetting need this 
  }

  function polygonLeftClickedCB (event, mapRelatedService, stateService) {
    var this_polygon = this;  // save this reference
    mapRelatedService.activePolygon = this;
    // console.log("polygon is left clicked");
    // console.log(this_polygon);
    if ( stateService.getStatus() === "arearemoving") {
      mapRelatedService.drawingPath.getPath().push(event.latLng);
      if ( mapRelatedService.drawingPath.getPath().getLength() === 1){
        mapRelatedService.temp_startmarker.setPosition(event.latLng);
        mapRelatedService.temp_startmarker.setMap(mapRelatedService.gmap);
      }
    }
  }

  function transformPolylineIntoPolygon (mapRelatedService, stateService){
    if (mapRelatedService.drawingPath.getPath().getLength() < 3){
      console.log("to be transformed drawingPath has less than 3 vertice, cannot transform.");
      return;
    }
    var temp_polygon = new google.maps.Polygon({
      path: mapRelatedService.drawingPath.getPath(),
      geodesic: false,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      editable: false
    });
    temp_polygon.setMap(mapRelatedService.gmap);
    temp_polygon.addListener("click",  function ( event ){
      polygonLeftClickedCB.call(this, event, mapRelatedService, stateService); // 
    });
    temp_polygon.addListener("rightclick", function () { 
      alert("right clicked");
    });
    temp_polygon.properties = {};
    // reset polyline
    mapRelatedService.drawingPath.setPath([]);
    mapRelatedService.temp_startmarker.setMap(null);
    mapRelatedService.polygons.push(temp_polygon);
  }

  function transformPolylineIntoRemovedArea(mapRelatedService, stateService){
    var drawingPath = mapRelatedService.drawingPath;
    if (drawingPath.getPath().getLength() < 3){
      console.log("to be transformed drawingPath has less than 3 vertice, cannot transform.");
    }
    var paths = mapRelatedService.activePolygon.getPaths();
    var direction0  =  mapRelatedService.spherical.computeSignedArea(paths.getAt(0));
    var direction1 = mapRelatedService.spherical.computeSignedArea( drawingPath.getPath() );
    if (direction1 * direction0 > 0) {
      var temp_latlngs2 = []
      while (drawingPath.getPath().getLength() >0){
        temp_latlngs2.push(drawingPath.getPath().pop());
      }
      drawingPath.setPath(temp_latlngs2);
    }
    paths.push( drawingPath.getPath());
    // reseting
    drawingPath.setPath([]);
    mapRelatedService.temp_startmarker.setMap(null);
  }
  return {
    polygonLeftClickedCB: polygonLeftClickedCB,
    transformPolylineIntoPolygon: transformPolylineIntoPolygon,
    transformPolylineIntoRemovedArea: transformPolylineIntoRemovedArea
  };
});


pmaServices.run(function (mapRelatedService){
  console.log("pmaServices run callback, just make sure mapRelatedService run first, so I declred dependency on mapRelatedService");
  (function settingMapContainerHeight(){
    // The reason might because the nav bar gives padding 70,
    $("#mapcover").height($(window).height() - 1 * $(".navbar").height());
  })();
  google.maps.Polygon.prototype.my_getBounds=function(){
    var bounds = new google.maps.LatLngBounds();
    this.getPath().forEach(function(element,index){
        // console.log("DEBUGG:" + element.toString());
        bounds.extend(element);
      })
    if (bounds.isEmpty()){
      alert("bounds should not be empty")
    }
    return bounds;
  }
});