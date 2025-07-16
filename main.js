import { Borne } from "./modules/Borne.js";
import { BornePublique } from "./modules/BornePublique.js";
import { BornePrivee } from "./modules/BornePrivee.js";

//Obtenir la lattitude et la longitude

function obtenirGeolocalisation(callback) {
    navigator.geolocation.getCurrentPosition((position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        console.log("Géolocalisation actuelle")
        console.log("Latitude : " + latitude);
        console.log("Longitude : " + longitude);

        callback(latitude, longitude);
    },
        (error) => {
            console.log("Erreur de géolocalisation", error.message);
        }
    );
};

//Mise en place d'une map
function afficherMap() {

    const map = L.map('map').setView([46.5895424, 3.325952], 13);

    //Ajout calque de tuiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    return map;
}
