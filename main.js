const utils = require('@iobroker/adapter-core');
const SunCalc = require('suncalc');
const moment = require('moment');

class HclControl extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'HCL-Control',
        });
    }

    async onReady() {
        this.subscribeStates('*');
        await this.setObjectNotExistsAsync('lightTemperature', {
            type: 'state',
            common: {
                name: 'Light temperature',
                type: 'number',
                role: 'level.temperature',
                read: true,
                write: false,
                def: 0,
                unit: 'K',
                desc: 'Current light temperature based on sun position and settings'
            },
            native: {},
        });

        await this.calculateLightTemperature();
        setInterval(() => {
            this.calculateLightTemperature();
        }, 60000);
    }

    async calculateLightTemperature() {
        const { latitude, longitude } = this.config;
        const now = new Date();
        const sunTimes = SunCalc.getTimes(now, latitude, longitude);
        const currentSeason = this.getSeason(now);
        const considerSeasons = this.config.considerSeasons;
        const manualTemperatureCurve = this.config.manualTemperatureCurve;
        const minTemperature = this.config.minTemperature;
        const maxTemperature = this.config.maxTemperature;

        let lightTemperature = 0;

        if (manualTemperatureCurve) {
            lightTemperature = this.calculateManualTemperature(now, minTemperature, maxTemperature);
        } else {
            lightTemperature = this.calculateAutoTemperature(now, sunTimes, currentSeason, considerSeasons, minTemperature, maxTemperature);
        }

        this.setState('lightTemperature', { val: lightTemperature, ack: true });
    }

    calculateAutoTemperature(now, sunTimes, currentSeason, considerSeasons, minTemperature, maxTemperature) {
        const daylightTime = sunTimes.sunrise < now && now < sunTimes.sunset;
        const seasonFactor = considerSeasons ? this.getSeasonFactor(currentSeason) : 1;
        const temperatureRange = maxTemperature - minTemperature;

        if (daylightTime) {
            const sunPosition = SunCalc.getPosition(now, this.config.latitude, this.config.longitude);
            const altitudeFactor = (sunPosition.altitude + Math.PI / 2) / Math.PI;
            return minTemperature + temperatureRange * altitudeFactor * seasonFactor;
        } else {
            return minTemperature;
        }
    }

    calculateManualTemperature(now, minTemperature, maxTemperature) {
        const timePeriod1 = this.config.timePeriod1;
        const timePeriod2 = this.config.timePeriod2;

        const nowMoment = moment(now);
        const period1Start = moment(timePeriod1.start, 'HH:mm');
        const period1End = moment(timePeriod1.end, 'HH:mm');
        const period2Start = moment(timePeriod2.start, 'HH:mm');
        const period2End = moment(timePeriod2.end, 'HH:mm');

        const temperatureRange = maxTemperature - minTemperature;

        if (nowMoment.isBetween(period1Start, period1End, undefined, '[]')) {
            const progress = nowMoment.diff(period1Start) / period1End.diff(period1Start);
            return minTemperature + temperatureRange * progress;
        } else if (nowMoment.isBetween(period2Start, period2End, undefined, '[]')) {
            const progress = nowMoment.diff(period2Start) / period2End.diff(period2Start);
            return maxTemperature - temperatureRange * progress;
        } else if (nowMoment.isBetween(period1End, period2Start, undefined, '[]')) {
            return maxTemperature;
        } else {
            return minTemperature;
        }
    }

    getSeason(date) {
        const month = date.getMonth() + 1;
        if (month >= 3 && month <= 5) {
            return 'spring';
        } else if (month >= 6 && month <= 8) {
            return 'summer';
        } else if (month >= 9 && month <= 11) {
            return 'autumn';
        } else {
            return 'winter';
        }
    }

    getSeasonFactor(season) {
        switch (season) {
            case 'spring':
                return 0.9;
            case 'summer':
                return 1;
            case 'autumn':
                return 0.8;
            case 'winter':
                return 0.7;
            default:
                return 1;
        }
    }

    onStateChange(id, state) {
        if (state && !state.ack) {
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        }
    }

    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (module.parent) {
    module.exports = (options) => new HclControl(options);
} else {
    new HclControl();
}

