// Create the base map tile layer
const streetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Initialize layer groups for different station statuses
const stationLayers = {
  COMING_SOON: new L.LayerGroup(),
  EMPTY: new L.LayerGroup(),
  LOW: new L.LayerGroup(),
  HEALTHY: new L.LayerGroup(),
  OUT_OF_ORDER: new L.LayerGroup()
};

// Create the Leaflet map with all layers
const bikeMap = L.map("map-id", {
  center: [40.73, -74.0059],
  zoom: 12,
  layers: Object.values(stationLayers)
});

// Add base layer to the map
streetMapLayer.addTo(bikeMap);

// Add overlay control for the layers
const overlayControls = {
  "Coming Soon": stationLayers.COMING_SOON,
  "Empty Stations": stationLayers.EMPTY,
  "Low Stations": stationLayers.LOW,
  "Healthy Stations": stationLayers.HEALTHY,
  "Out of Order": stationLayers.OUT_OF_ORDER
};
L.control.layers(null, overlayControls).addTo(bikeMap);

// Legend control element
const legendControl = L.control({ position: "bottomright" });
legendControl.onAdd = function () {
  return L.DomUtil.create("div", "legend");
};
legendControl.addTo(bikeMap);

// Custom icons per station status
const stationIcons = {
  COMING_SOON: L.ExtraMarkers.icon({
    icon: "ion-settings",
    iconColor: "white",
    markerColor: "yellow",
    shape: "star"
  }),
  EMPTY: L.ExtraMarkers.icon({
    icon: "ion-android-bicycle",
    iconColor: "white",
    markerColor: "red",
    shape: "circle"
  }),
  LOW: L.ExtraMarkers.icon({
    icon: "ion-android-bicycle",
    iconColor: "white",
    markerColor: "orange",
    shape: "circle"
  }),
  HEALTHY: L.ExtraMarkers.icon({
    icon: "ion-android-bicycle",
    iconColor: "white",
    markerColor: "green",
    shape: "circle"
  }),
  OUT_OF_ORDER: L.ExtraMarkers.icon({
    icon: "ion-minus-circled",
    iconColor: "white",
    markerColor: "blue-dark",
    shape: "penta"
  })
};

// Load station info and status, then place markers
d3.json("https://gbfs.citibikenyc.com/gbfs/en/station_information.json").then(function (stationInfoData) {
  d3.json("https://gbfs.citibikenyc.com/gbfs/en/station_status.json").then(function (stationStatusData) {
    const lastUpdateTime = stationInfoData.last_updated;
    const stationDetails = stationInfoData.data.stations;
    const stationStatusList = stationStatusData.data.stations;

    const stationCountByStatus = {
      COMING_SOON: 0,
      EMPTY: 0,
      LOW: 0,
      HEALTHY: 0,
      OUT_OF_ORDER: 0
    };

    for (let i = 0; i < stationDetails.length; i++) {
      const mergedStation = Object.assign({}, stationDetails[i], stationStatusList[i]);

      let statusKey;
      if (!mergedStation.is_installed) {
        statusKey = "COMING_SOON";
      } else if (!mergedStation.num_bikes_available) {
        statusKey = "EMPTY";
      } else if (mergedStation.is_installed && !mergedStation.is_renting) {
        statusKey = "OUT_OF_ORDER";
      } else if (mergedStation.num_bikes_available < 5) {
        statusKey = "LOW";
      } else {
        statusKey = "HEALTHY";
      }

      stationCountByStatus[statusKey]++;

      const stationMarker = L.marker([mergedStation.lat, mergedStation.lon], {
        icon: stationIcons[statusKey]
      }).bindPopup(`
        <strong>${mergedStation.name}</strong><br>
        Capacity: ${mergedStation.capacity}<br>
        ${mergedStation.num_bikes_available} Bikes Available
      `);

      stationMarker.addTo(stationLayers[statusKey]);
    }

    updateLegend(lastUpdateTime, stationCountByStatus);
  });
});

// Function to update legend with timestamp and counts
function updateLegend(unixTimestamp, statusCounts) {
  document.querySelector(".legend").innerHTML = `
    <p>Updated: ${moment.unix(unixTimestamp).format("h:mm:ss A")}</p>
    <p class='out-of-order'>Out of Order: ${statusCounts.OUT_OF_ORDER}</p>
    <p class='coming-soon'>Coming Soon: ${statusCounts.COMING_SOON}</p>
    <p class='empty'>Empty: ${statusCounts.EMPTY}</p>
    <p class='low'>Low: ${statusCounts.LOW}</p>
    <p class='healthy'>Healthy: ${statusCounts.HEALTHY}</p>
  `;
}
