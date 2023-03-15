$(function () {
    const adapterName = 'hcl-control';

    loadSystemConfig(function (systemConfig) {
        systemLang = systemConfig.common.language;
        init();
    });

    function init() {
        loadSettings(prepare);
    }

    function prepare(settings) {
        $('#minTemperature').val(settings.minTemperature);
        $('#maxTemperature').val(settings.maxTemperature);
        $('#considerSeasons').prop('checked', settings.considerSeasons);
        $('#manualTemperatureCurve').prop('checked', settings.manualTemperatureCurve);
        $('#timePeriod1Start').val(settings.timePeriod1Start);
        $('#timePeriod1End').val(settings.timePeriod1End);
        $('#timePeriod2Start').val(settings.timePeriod2Start);
        $('#timePeriod2End').val(settings.timePeriod2End);

        onChange(false);
        $('input').on('change', function () {
            onChange(true);
        });
    }

    function save(callback) {
        const settings = {
            minTemperature: parseInt($('#minTemperature').val(), 10),
            maxTemperature: parseInt($('#maxTemperature').val(), 10),
            considerSeasons: $('#considerSeasons').prop('checked'),
            manualTemperatureCurve: $('#manualTemperatureCurve').prop('checked'),
            timePeriod1Start: $('#timePeriod1Start').val(),
            timePeriod1End: $('#timePeriod1End').val(),
            timePeriod2Start: $('#timePeriod2Start').val(),
            timePeriod2End: $('#timePeriod2End').val()
        };

        saveSettings(settings, callback);
    }

    function onChange(isChanged) {
        if (isChanged) {
            $('#save').removeAttr('disabled');
        } else {
            $('#save').attr('disabled', true);
        }
    }

    $('#save').on('click', function () {
        save(function () {
            setTimeout(function () {
                onChange(false);
            }, 0);
        });
    });

    $('#cancel').on('click', function () {
        init();
    });
});
