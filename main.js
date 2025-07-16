import { Borne } from "./modules/Borne.js";
import { BornePublique } from "./modules/BornePublique.js";
import { BornePrivee } from "./modules/BornePrivee.js";

/************************************/
/*********API LEAFLET ***************/
/************************************/

let map; // variable globale pour la carte
let borneSelectionnee = null; // Nouvelle variable pour stocker la borne cliquée

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
                resultatRch.textContent = "Adresse non trouvée. 222 boulevard Gustave Flaubert, Clermont-Ferrand";
                resultatRch.innerHTML += `<br>Latitude : 45.75806298279684<br>Longitude : 3.1270760116784317`;
            } else {
                const place = data[0];
                resultatRch.innerHTML = `
                Adresse trouvée : ${place.display_name} <br>
                Latitude : ${place.lat} <br>
                Longitude : ${place.lon}`;

                map.setView([place.lat, place.lon], 13);
                L.marker([place.lat, place.lon]).addTo(map);
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

/**Fonction récupérer bornes dans un rayon de 5 km et afficher markeurs */
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

                const idBorne = borne.id || borne.properties.id || null;
                const access = borne.properties.access || "";
                const type = borne.properties.amenity || "";
                const name = borne.properties.name || "Borne sans nom"; // Ajout d'un nom pour le popup

                let instanceBorne;
                if (access === "private") {
                    const proprietaire = borne.properties.owner || "Inconnu";
                    instanceBorne = new BornePrivee(idBorne, type, lat, lon, proprietaire);
                } else if (type === "charging_station") {
                    instanceBorne = new BornePublique(idBorne, type, lat, lon);
                }

                if (instanceBorne) {
                    const marker = L.marker([lat, lon]).addTo(map);
                    marker.bindPopup(`<b>${name}</b><br>Type: ${type}<br>Accès: ${access}`); // Ajout d'un popup

                    marker.on('click', () => {
                        borneSelectionnee = instanceBorne; // Stocker la borne cliquée
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
            console.error("Erreur lors de la récupération ou de l'affichage des bornes : ", error);
        });
}

/**Fonction qui affiche les bornes sous forme de liste html */
function afficherEnListe(data) {
    const bornes = data.features;
    const liste = document.getElementById("liste_html");
    liste.innerHTML = ""; // Vide la liste avant de la remplir

    bornes.forEach(borne => {
        const [lon, lat] = borne.geometry.coordinates;
        const idBorne = borne.id || borne.properties.id || null;
        const access = borne.properties.access || "";
        const type = borne.properties.amenity || "";
        const name = borne.properties.name || "Nom inconnu";

        let instanceBorne;
        if (access === "private") {
            const proprietaire = borne.properties.owner || "Inconnu";
            instanceBorne = new BornePrivee(idBorne, type, lat, lon, proprietaire);
        } else if (type === "charging_station") {
            instanceBorne = new BornePublique(idBorne, type, lat, lon);
        }

        const li = document.createElement("li");
        li.textContent = `Borne : ${name} (Lat: ${lat}, Lon: ${lon})`;

        const btnReserver = document.createElement("button");
        btnReserver.textContent = "Réserver";
        btnReserver.classList.add("btn_reserver");
        btnReserver.addEventListener('click', () => {
            borneSelectionnee = instanceBorne; // Stocker la borne pour la réservation
            ouvrirModale(instanceBorne);
        });

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
            console.log("Données non disponibles pour afficher la liste. Récupération en cours...");
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
function ouvrirModale(borne) {
    const modale = document.getElementById("form_resa");
    modale.style.display = "block";
    console.log("Modale ouverte pour la borne:", borne);
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
    document.getElementById("date_resa").value = getDateDuJour();
    document.getElementById("heure_resa").value = getHeureParDefaut();
    document.getElementById("duree_resa").value = 1;
}

/******************************** ***************/
/*********VALIDER LES DONNEES DU FORM********** */
/******************************** ***************/

/*Fonction pour valider les données du formulaire*/
function validerDonnees(date, heureDebut, duree) {
    const now = new Date();
    const selectedDateTime = new Date(`${date}T${heureDebut}`);

    if (selectedDateTime < now) {
        alert("La date et l'heure doivent être aujourd'hui ou dans le futur.");
        return false;
    }

    const heure = selectedDateTime.getHours();
    if (heure < 6 || heure > 22) {
        alert("L'heure de début doit être entre 6h et 22h.");
        return false;
    }

    if (isNaN(duree) || duree < 1 || duree > 6) {
        alert("La durée doit être comprise entre 1 et 6 heures.");
        return false;
    }

    return true;
}
/******************************** */
/*********RESERVATION BORNES********** */
/******************************** */

/** Fonction pour créer la réservation sous forme d'objet*/
function creerReservation(idBorne, typeBorne, date, heureDebut, duree) {
    return {
        idBorne,
        typeBorne,
        date,
        heureDebut,
        duree
    };
}

// Fonction appelée au submit du formulaire
function gererSoumission(event) {
    event.preventDefault();

    if (!borneSelectionnee) {
        alert("Aucune borne n'a été sélectionnée pour la réservation.");
        return;
    }

    const date = document.getElementById("date_resa").value;
    const heureDebut = document.getElementById("heure_resa").value;
    const duree = parseInt(document.getElementById("duree_resa").value, 10);

    if (!validerDonnees(date, heureDebut, duree)) {
        return;
    }

    const idBorne = borneSelectionnee.idBorne;
    const typeBorne = borneSelectionnee.type;

    const reservation = creerReservation(idBorne, typeBorne, date, heureDebut, duree);

    const anciennesReservations = JSON.parse(localStorage.getItem("reservations")) || [];
    anciennesReservations.push(reservation);
    localStorage.setItem("reservations", JSON.stringify(anciennesReservations));

    alert("Réservation enregistrée et sauvegardée !");

    event.target.reset();
    initialiserFormulaire();
    fermerModale();

    afficherHistorique();
}


/****************************************************** */
/*********HISTORIQUE ET SUPPRESSION ******************** */
/****************************************************** */

/**Fonction lire les réservations depuis le local storage */
function lireResaLocalStorage() {
    let objectString = localStorage.getItem("reservations");

    if (!objectString) {
        console.log("Aucune réservation trouvée");
        return [];
    }

    let reservations = JSON.parse(objectString);

    // Affichage de chaque réservation
    reservations.forEach((resa, index) => {
        console.log(`Réservation ${index + 1} :`);
        console.log(`- ID Borne : ${resa.idBorne}`);
        console.log(`- Type : ${resa.typeBorne}`);
        console.log(`- Date : ${resa.date}`);
        console.log(`- Heure de début : ${resa.heureDebut}`);
        console.log(`- Durée : ${resa.duree}h`);
    });

    return reservations;
}

/**Fonction qui affiche l'historiue dans un tableau / avec supression et maj du local storage */
function afficherHistorique() {

    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";

    const reservations = lireResaLocalStorage(); //Récup les résas

    reservations.forEach((resa, index) => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = resa.idBorne;

        const tdType = document.createElement("td");
        tdType.textContent = resa.typeBorne;

        const tdDate = document.createElement("td");
        tdDate.textContent = resa.date;

        const tdHeure = document.createElement("td");
        tdHeure.textContent = resa.heureDebut;

        const tdDuree = document.createElement("td");
        tdDuree.textContent = resa.duree;

        const tdBtn = document.createElement("td");
        const btnSupprimer = document.createElement("button");
        btnSupprimer.textContent = "Supprimer";

        tdBtn.appendChild(btnSupprimer);

        tr.appendChild(tdId);
        tr.appendChild(tdType);
        tr.appendChild(tdDate);
        tr.appendChild(tdHeure);
        tr.appendChild(tdDuree);
        tr.appendChild(tdBtn);

        tbody.appendChild(tr);
    });

}

/**Fonction au click pour la suppression de la résa */


/****************************************************** */
/*********INITIALISATION AU CHARGEMENT DU DOM********** */
/****************************************************** */

/**Initialisation au chargement du DOM*/
document.addEventListener("DOMContentLoaded", () => {
    initialiserFormulaire();
    afficherMap(); // Affiche la carte au chargement
    obtenirGeolocalisation(); // Prépare le formulaire de recherche d'adresse
    recupererBornesProches(); // Charge et affiche les bornes
    basculerVue(); // Active le bouton bascule vue
    lireResaLocalStorage();
    afficherHistorique();
    document.getElementById("form_resa").addEventListener("submit", gererSoumission); // Ajoute l'écouteur de soumission
    document.getElementById("fermer_modale").addEventListener("click", fermerModale); //bouton avec cet ID pour fermer la modale
});
