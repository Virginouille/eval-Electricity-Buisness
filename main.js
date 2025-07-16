import { Borne } from "./modules/Borne.js";
import { BornePublique } from "./modules/BornePublique.js";
import { BornePrivee } from "./modules/BornePrivee.js";

/************************************/
/*********API LEAFLET ***************/
/************************************/

let map; // variable globale pour la carte

/**Fonction afficher map */

function afficherMap(lat = 45.75806298279684, lon = 3.1270760116784317) {
    map = L.map('map').setView([lat, lon], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

/***********************************/
/********* API NOMINATIM ***********/
/***********************************/

/***Fonction recherche adresse****** */

function obtenirGeolocalisation() {

    document.getElementById("zone_adresse").addEventListener("submit", async function (event) {
        event.preventDefault();
        const addresse = document.getElementById("adresse").value.trim();
        const resultatRch = document.getElementById("resultat_recherche");
        resultatRch.textContent = "Recherche en cours...";

        if (!addresse) {
            resultatRch.textContent = "Veuillez saisir une adresse.";
            return;
        }

        try {
            // Appel à k'api
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addresse)}`;
            const reponse = await fetch(url, {
                headers: {
                    'Accept-Language': 'fr'
                }
            });

            if (!reponse.ok) {
                throw new Error("Erreur réseau");
            }

            const data = await reponse.json();

            if (data.length === 0) {
                // Si pas de résultat
                resultatRch.textContent = "Adresse non trouvée. 222 boulevard Gustave Flaubert, Clermont-Ferrand";
                resultatRch.innerHTML += `<br>Latitude : 45.75806298279684<br>Longitude : 3.1270760116784317`;
            } else {
                const place = data[0];
                resultatRch.innerHTML = `
            Adresse trouvée : ${place.display_name} <br>
            Latitude : ${place.lat} <br>
            Longitude : ${place.lon}`;

                // Mise à jour de la vue sur la carte avec les nouvelles coordonnées
                map.setView([place.lat, place.lon], 13);

                //ajout du marker à l'adresse
                const marker = L.marker([place.lat, place.lon]).addTo(map);
            }
        } catch (error) {
            resultatRch.textContent = "Erreur lors de la recherche : " + error.message;
        }
    });

}


/**Fonction récupérer bornes dans un rayon de 5 km */

afficherMap();
obtenirGeolocalisation();

