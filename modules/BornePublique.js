import { Borne } from "./Borne.js";

export class BornePublique extends Borne {

    lat;
    lon;

    constructor(idBorne, type, date, heure, lat, lon) {
        super(idBorne, type, date, heure);
        this.lat = lat;
        this.lon = lon;
    }
}