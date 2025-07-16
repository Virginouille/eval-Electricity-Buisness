import { Borne } from "./Borne.js";

export class BornePrivee extends Borne {

    lat;
    lon;
    proprietaire;

    constructor(idBorne, type, date, heure, lat, lon, proprietaire) {
        super(idBorne, type, date, heure);
        this.lat = lat;
        this.lon = lon;
        this.proprietaire = proprietaire;
    }
}