'use strict';

const utils = require('@iobroker/adapter-core');
const SunCalc = require('suncalc');

class HclControl extends utils.Adapter {

    onReady() {
        this.log.info('HCL-Control Adapter is ready');

        this.setInitialState();

        // Execute update function every minute
        this.updateInterval = setInterval(this.updateLightTemperature.bind(this), 60 * 1000);
    }

    setInitialState() {
        this.config.minTemperature = this.config.minTemperature || 2700;
        this.config.maxTemperature = this.config.maxTemperature || 6500;
        this.config.considerSeasons = this.config.considerSeasons === undefined ? true : this.config.considerSeasons;
        this.config.manualTemperatureCurve = this.config.manualTemperatureCurve === undefined ? false : this.config.manualTemperatureCurve;
        this.config.timePeriod1Start = this.config.timePeriod1Start || '06:00';
        this.config.timePeriod1End = this.config.timePeriod1End || '12:00';
        this.config.timePeriod2Start = this.config.timePeriod2Start || '18:00';
        this.config.timePeriod2End = this.config.timePeriod2End || '22:00';
    }

    updateLightTemperature() {
        const now = new Date();
        const sunTimes = SunCalc.getTimes(now, this.config.latitude, this.config.longitude);
        let temperature;

        if (this.config.manualTemperatureCurve) {
            temperature = this.calculateManualTemperature(now);
        } else {
            temperature = this.calculateTemperatureBasedOnSunPosition(now, sunTimes);
        }

        this.setState('lightTemperature', temperature, true);
    }

    calculateManualTemperature(now) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const period1Start = this.timeToMinutes(this.config.timePeriod1Start);
        const period1End = this.timeToMinutes(this.config.timePeriod1End);
        const period2Start = this.timeToMinutes(this.config.timePeriod2Start);
        const period2End = this.timeToMinutes(this.config.timePeriod2End);

        let temperature;

        if (currentTime >= period1Start && currentTime <= period1End) {
            const progress = (currentTime - period1Start) / (period1End - period1Start);
            temperature = this.config.minTemperature + (this.config.maxTemperature - this.config.minTemperature) * progress;
        } else if (currentTime >= period2Start && currentTime <= period2End) {
            const progress = (currentTime - period2Start) / (period2End - period2Start);
            temperature = this.config.maxTemperature - (this.config.maxTemperature - this.config.minTemperature) * progress;
        } else {
            temperature = currentTime > period1End && currentTime < period2Start ? this.config.maxTemperature : this.config.minTemperature;
        }

        return temperature;
    }

    calculateTemperatureBasedOnSunPosition(now, sunTimes) {
        const maxTemperature = 6500;
        const minTemperature = 2700;
        const temperatureRange = maxTemperature - minTemperature;

        if (now < sunTimes.sunriseEnd || now > sunTimes.sunsetStart) {
            return minTemperature;
        }

        const solarNoon = sunTimes.solarNoon;
        const dayDurationInMinutes = (sunTimes.sunsetStart - sunTimes.sunriseEnd) / 60000;
        const minutesSinceSunrise = (now - sunTimes.sunriseEnd) / 60000;

        let progress = minutesSinceSunrise / dayDurationInMinutes;

        if (this.config.considerSeasons) {
            const currentMonth = now.getMonth();
            const seasonProgress = (currentMonth % 6) / 5;
            progress = (progress + seasonProgress) / 2;
        }

        return maxTemperature - temperatureRange * progress;
    }

    timeToMinutes(timeString) {
        const timeArray = timeString.split(':');
        const hours = parseInt(timeArray[0], 10);
        const minutes = parseInt(timeArray[1], 10);
        return hours * 60 + minutes;
    }

    onUnload(callback) {
        clearInterval(this.updateInterval);
        callback();
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // @ts-ignore parent is a valid property on module
    module.exports = (options) => new HclControl(options);
} else {
    // otherwise start the instance directly
    new HclControl();
}
