
function formMilesDec(val_monto) {
	var tmp = val_monto + ' ', val_rpta;
	var pos = tmp.indexOf('.'), val_dec;

	if (pos >= 0) {
		val_dec = tmp.substr(pos + 1, 2) + '00';
		tmp = tmp.substr(0, pos) + ' ';
	}

	val_rpta = tmp.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d)\.?)/g, ",");

	if (pos >= 0) {
		val_rpta = val_rpta + '.' + val_dec.substr(0, 2);
	} else {
		val_rpta = val_rpta + '.00';
	}

	if (val_monto < 0) {
		val_rpta = '-' + val_rpta;
	}

	return val_rpta;
}

function formMiles( val_monto){
	var tmp = val_monto + ' ', val_rpta;

	val_rpta = tmp.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d)\.?)/g, ",");

	if (val_monto < 0) {
		val_rpta = '-' + val_rpta;
	}
	
	return val_rpta;
}

function convFecNum( val_fecha){
	var fec_obj, fectmp = val_fecha;
	
	if (val_fecha){	
		fectmp = fectmp.replace('/Date(', '');
		fectmp = fectmp.replace(')/', '');
		fectmp = fectmp / 1000;
		
		if (fectmp > 1000000){				
			fec_obj = $.parseJSON('{"date_created":"' + fectmp + '"}'),
			fectmp = new Date(1000*fec_obj.date_created);
			fectmp = fectmp.format("dd/mm/yyyy");
		}else{
			fectmp = '';
		}				
	}else{
		fectmp = '';
	}
		
	return fectmp;	
}

function convFecNumMes(val_fecha) {
	var fec_obj, fectmp = val_fecha;

	if (val_fecha) {
		fectmp = fectmp.replace('/Date(', '');
		fectmp = fectmp.replace(')/', '');
		fectmp = fectmp / 1000;

		if (fectmp > 1000000) {
			fec_obj = $.parseJSON('{"date_created":"' + fectmp + '"}'),
				fectmp = new Date(1000 * fec_obj.date_created);
			fectmp = fectmp.format("mmm-yyyy").toUpperCase();

		} else {
			fectmp = '';
		}
	} else {
		fectmp = '';
	}

	return fectmp;
}

function convFecPeriodo(val_fecha) {
	var fec_obj, fectmp = val_fecha;

	if (val_fecha) {
		fectmp = fectmp.replace('/Date(', '');
		fectmp = fectmp.replace(')/', '');
		fectmp = fectmp / 1000;

		if (fectmp > 1000000) {
			fec_obj = $.parseJSON('{"date_created":"' + fectmp + '"}'),
				fectmp = new Date(1000 * fec_obj.date_created);
			fectmp = fectmp.format("yyyymm").toUpperCase();

		} else {
			fectmp = '';
		}
	} else {
		fectmp = '';
	}

	return fectmp;
}

function textoCapital( des_texto){
	var tmp = des_texto.toLowerCase();
	
	return tmp.charAt(0).toUpperCase() + tmp.slice(1);
	
}

function obtNumRomano( num ){
	
	switch(num){
		
		case 0:  return '';
		case 1:  return 'I';
		case 2:  return 'II';
		case 3:  return 'III';
		case 4:  return 'IV';
		case 5:  return 'V';
		case 6:  return 'VI';
		case 7:  return 'VII';
		case 8:  return 'VIII';
		case 9:  return 'IX';
		case 10:  return 'X';
		
	}
	
	return '';
	
}

var dateFormat = function () {
	var    token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var    _ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
		"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

