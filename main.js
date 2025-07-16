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


/******************************** */
/*******Bornes à proximité ********/
/******************************** */

let bornesData = null;

/**Fonction récupérer bornes dans un rayon de 5 km et afficher markeurs */ //A améliorer en divisant le fonction en deux récup bornes et afficher markeurs
function recupererBornesProches() {
    fetch("bornes.json")
        .then(response => {
            if (!response.ok) throw new Error("Erreur chargement du json");
            return response.json();
        })
        .then(data => {
            console.log(data);
            bornesData = data;

            bornesData.features.forEach(borne => {
                const [lon, lat] = borne.geometry.coordinates;

                // Récupération des propriétés importantes
                const idBorne = borne.id || borne.properties.id || null;
                const access = borne.properties.access || "";
                const type = borne.properties.amenity || "";

                // Instanciation selon access
                let instanceBorne;
                if (access === "private") {
                    const proprietaire = borne.properties.owner || "Inconnu";
                    instanceBorne = new BornePrivee(idBorne, type, date, heure, lat, lon, proprietaire);
                } else if (type === "charging_station") {
                    instanceBorne = new BornePublique(idBorne, type, date, heure, lat, lon);
                }

                if (instanceBorne) {
                    const marker = L.marker([lat, lon]).addTo(map);

                    marker.on('click', () => {
                        const modale = document.getElementById("form_resa");
                        if (modale.style.display === "block") {
                            fermerModale();
                        } else {
                            ouvrirModale(instanceBorne);
                        }
                    });
                }
            });
        })
        .catch(error => {
            console.error("Erreur : ", error);
        });

    return data.features;
}
/**Fonction qui affiche les bornes sous forme de liste html */ //A adapter à la recherche car là lié directement au data du json
function afficherEnListe(data) {

    const bornes = data.features;
    const liste = document.getElementById("liste_html");

    liste.innerHTML = "";

    bornes.forEach(borne => {

        const [lon, lat] = borne.geometry.coordinates;

        const li = document.createElement("li");
        li.textContent = `Borne : ${borne.properties.name || "Nom inconnu"} (${lat}, ${lon})`;

        const btnReserver = document.createElement("button");
        btnReserver.textContent = "Réserver";
        btnReserver.classList.add("btn_reserver");

        li.appendChild(btnReserver);
        liste.appendChild(li);

    });
}

/**Fonction basculer vue (carte et liste)*/
function basculerVue() {

    const btnBasculer = document.getElementById("btn_basculer_vue");
    const carte = document.getElementById("map");
    const liste = document.getElementById("liste_html");

    let vueCarteActive = true;

    btnBasculer.addEventListener("click", (event) => {
        event.preventDefault();

        if (!bornesData) {
            console.log("Données non disponibles pour afficher la liste.");
            return;
        }

        if (vueCarteActive) {
            carte.style.display = "none";
            liste.style.display = "block";
            afficherEnListe(bornesData); // affiche la liste des bornes
        } else {
            liste.style.display = "none";
            carte.style.display = "block";
        }

        vueCarteActive = !vueCarteActive;
    });
}

/******************************************************* */
/********* MODALE RESERVATION********** */
/******************************************************* */

/**Fonction pour ouvrir modale */
function ouvrirModale() {

    const modale = document.getElementById("form_resa");
    modale.style.display = "block";
}

/**Fonction fermer modale */
function fermerModale() {
    const modale = document.getElementById("form_resa");
    modale.style.display = "none";
}

/************************************************ */
/*********FORMATAGE DES DONNEES DU FORM ********** */
/******************************** *****************/

/*Fonction pour obtenir la date du jour*/
function getDateDuJour() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**Fonction pour obtenir l'heure de début par défaut entre 6h et 22h*/
function getHeureParDefaut() {
    const now = new Date();
    let h = now.getHours();
    if (h < 6) h = 6;
    if (h > 22) h = 22;
    return `${String(h).padStart(2, '0')}:00`;
}

/* Fonction pour initialiser les valeurs du formulaire*/
function initialiserFormulaire() {
    document.getElementById('date_resa').value = getDateDuJour();
    document.getElementById('heure_resa').value = getHeureParDefaut();
    document.getElementById('duree_resa').value = 1;
}

/******************************** */
/*********RESERVATION BORNES********** */
/******************************** */

function reserverBorne() {
    //date du jour par default
    //heure format 24 h
}

initialiserFormulaire();
afficherMap();
obtenirGeolocalisation();
basculerVue();
recupererBornesProches();
cliquerMarker();
formatageDonnees();



