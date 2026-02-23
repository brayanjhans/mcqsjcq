
var lis_uepanio = [], lis_infobra = [];
var listFoni = [], devenArray = [], anioArray = [], pimtArray = [];
var listAnio = [], listMesDev = [], listFteFi = [], listMesUEP = [];
var listParal = [], listAnioFon = [];

var html_foni_res, html_devhis_res, html_especif_res, html_uep_res;
var html_obra_res, html_bien_res, html_serv_res, html_cons_res;
var html_oxi_res, html_oxi_res_2, html_oxi_res_3;
var html_infobra_res, html_avanob_res, html_paral_res;

function most_uep_fte(inv_cu) {
	var html_uep1 = '';

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "UEP" },
		success: function (lista_uep) {

			html_uep1 = ''; html_uep_res = '';

			html_uep_res += '<tr style="font-weight: bold; "><th width="56%" > UNIDADES EJECUTORAS</th>';
			html_uep_res += '<th width="30%">DEVENGADO ACUMULADO</th><th width="14%" colspan="2"> DETALLE</th></tr>';

			$.each(lista_uep, function (idxf, itemf) {

				html_uep1 += '<tr class=" fil_hisfinan">';
				html_uep1 += '<td style="font-weight:bold;">' + itemf.DES_UEP + '</td>';
				html_uep1 += '<td>' + formMilesDec(itemf.MTO_DEVEN) + '</td>';
				html_uep1 += '<td data-bs-toggle="modal" data-bs-target="#modFteFinan" data-bs-whatever="' + itemf.SEC_EJEC + '">';
				html_uep1 += '<img class="img_histf" src="../Content/img/detuep1.png" data-toggle="tooltip" data-placement="left" title="Información financiera por fuente de financiamiento"/></td>';
				html_uep1 += '<td data-bs-toggle="modal" data-bs-target="#modDevUEP" data-bs-whatever="' + itemf.SEC_EJEC + '">';
				html_uep1 += '<img class="img_histf" src="../Content/img/detuep2.png" data-toggle="tooltip" data-placement="bottom" title="Información financiera por año de ejecución"/></td></tr>';

				html_uep_res += '<tr><td width="56%" style="vertical-align:middle;">' + itemf.DES_UEP + '</td>';
				html_uep_res += '<td width="30%" style="vertical-align:middle;">' + formMilesDec(itemf.MTO_DEVEN) + '</td>';
				html_uep_res += '<td width="6%" data-bs-toggle="modal" data-bs-target="#modFteFinan" data-bs-whatever="' + itemf.SEC_EJEC + '">';
				html_uep_res += '<img src="../Content/img/detuep1.png" data-toggle="tooltip" data-placement="bottom" title="Información financiera por fuente de financiamiento"/></td>';
				html_uep_res += '<td width="8%" data-bs-toggle="modal" data-bs-target="#modDevUEP" data-bs-whatever="' + itemf.SEC_EJEC + '">';
				html_uep_res += '<img src="../Content/img/detuep2.png" data-toggle="tooltip" data-placement="bottom" title="Información financiera por año de ejecución"/></td></tr>';

			});

			$("#tb_uep").html(html_uep1);

			$("#tb_uep_res").html(html_uep_res);

		},

	});

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "UEPM" },
		success: function (lis_uepm) {

			listMesUEP = [];
			listMesUEP = lis_uepm;

		},

	});

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "UEPA" },
		success: function (lis_aniou) {

			lis_uepanio = [];
			lis_uepanio = lis_aniou;

		},

	});

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "FTE" },
		success: function (lista_fte) {

			listFteFi = [];
			listFteFi = lista_fte;

		},

	});

}

function most_especifica(inv_cu) {

	var html_especif = '', arr_especif = [], lis_especif = [];
	var cod_especif, des_especif, mto_tot_especif, fec_hoy = new Date();
	var mto_anio1, mto_anio2, mto_anio3, mto_anio4, mto_anio5; 
	var anio_esp_1, anio_esp_2, anio_esp_3, anio_esp_4, anio_esp_5;

	anio_esp_5 = fec_hoy.getFullYear();
	anio_esp_4 = anio_esp_5 - 1;
	anio_esp_3 = anio_esp_5 - 2;
	anio_esp_2 = anio_esp_5 - 3;
	anio_esp_1 = anio_esp_5 - 4; 

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeDevEspecifica",
		//url: "/invierteWS/Ssi/traeDevEspecificaBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "ESPECIF" },
		success: function (lista_esp) {

			arr_especif = [];

			$.each(lista_esp, function (idxf, itemf) {
				cod_especif = $.trim(itemf.COD_ESPECIFICA);

				if ($.inArray(cod_especif, arr_especif) == -1) { arr_especif.push(cod_especif); }

			});

			html_especif = ''; html_especif_res = '';

			html_especif_res += '<tr style="font-weight: bold; "><th width = "40%" > ESPECÍFICA DE GASTO</th >';
			html_especif_res += '<th width="10%"> ' + anio_esp_1 + '</th><th width="10%"> ' + anio_esp_2 + '</th>';
			html_especif_res += '<th width="10%"> ' + anio_esp_3 + '</th><th width="10%"> ' + anio_esp_4 + '</th>';
			html_especif_res += '<th width="10%"> ' + anio_esp_5 + '</th><th width="10%"> TOTAL</th></tr>';

			$("#esp_an01_res").html(anio_esp_1);
			$("#esp_an02_res").html(anio_esp_2);
			$("#esp_an03_res").html(anio_esp_3);
			$("#esp_an04_res").html(anio_esp_4);
			$("#esp_an05_res").html(anio_esp_5);

			$.each(arr_especif, function (idx_e, item_e) {

				lis_especif = [];
				des_especif = '';
				mto_anio1 = 0; mto_anio2 = 0; mto_anio3 = 0; mto_anio4 = 0; mto_anio5 = 0;

				lis_especif = lista_esp.filter(function (list) { return list.COD_ESPECIFICA == item_e; });

				$.each(lis_especif, function (idx_f, item_f) {
					des_especif = item_f.DES_ESPECIFICA;

					switch (parseInt(item_f.NUM_ANIO)) { 
						case anio_esp_1: mto_anio1 = item_f.MTO_DEVEN; break;
						case anio_esp_2: mto_anio2 = item_f.MTO_DEVEN; break;
						case anio_esp_3: mto_anio3 = item_f.MTO_DEVEN; break;
						case anio_esp_4: mto_anio4 = item_f.MTO_DEVEN; break;
						case anio_esp_5: mto_anio5 = item_f.MTO_DEVEN; break;
					}

				});

				mto_tot_especif = Math.round((mto_anio1 + mto_anio2 + mto_anio3 + mto_anio4 + mto_anio5) + "e+2") / 100;

				html_especif += '<tr class="fil_hisfinan">';
				html_especif += '<td style="font-weight:bold; text-align:left;">' + item_e + ' ' + des_especif + '</td>';
				html_especif += '<td>' + formMilesDec(mto_anio1) + '</td>';
				html_especif += '<td>' + formMilesDec(mto_anio2) + '</td>';
				html_especif += '<td>' + formMilesDec(mto_anio3) + '</td>';
				html_especif += '<td>' + formMilesDec(mto_anio4) + '</td>';
				html_especif += '<td>' + formMilesDec(mto_anio5) + '</td>';
				html_especif += '<td>' + formMilesDec(mto_tot_especif) + '</td></tr>';

				html_especif_res += '<tr><td width="40%" style="text-align: left;">' + item_e + ' ' + des_especif + '</td>';
				html_especif_res += '<td width="10%">' + formMilesDec(mto_anio1) + '</td>';
				html_especif_res += '<td width="10%">' + formMilesDec(mto_anio2) + '</td>';
				html_especif_res += '<td width="10%">' + formMilesDec(mto_anio3) + '</td>';
				html_especif_res += '<td width="10%">' + formMilesDec(mto_anio4) + '</td>';
				html_especif_res += '<td width="10%">' + formMilesDec(mto_anio5) + '</td>';
				html_especif_res += '<td width="10%">' + formMilesDec(mto_tot_especif) + '</td></tr>';

			});

			$("#tb_hist_especif").html(html_especif);

			$("#tb_hist_especif_res").html(html_especif_res);


		},

	});

}

var dev_mes1, dev_mes2, dev_mes3, dev_mes4, dev_mes5, dev_mes6, dev_mes7;
var dev_mes8, dev_mes9, dev_mes10, dev_mes11, dev_mes12;
var dev_acum_inv = 0, dev_anio_inv = 0, pim_anio_inv = 0;
var prim_dev_inv, ult_dev_inv;

function most_dev_hist(inv_cu) {
	var hist_Anio = [], listDevInv = [];
	var anio_dev, html_mes = '', html_dev1 = '';

	$("#des_inf_finan").html('&nbsp I. INFORMACIÓN FINANCIERA (S/)');

	$("#pridev").html('');
	$("#ultdev").html('');
	$("#val_pim").html('0');
	$("#val_avan").html('0');
	$("#val_efin").html('0');
	dev_acum_inv = 0; dev_anio_inv = 0; pim_anio_inv = 0;
	prim_dev_inv = ''; ult_dev_inv = '';

	$.ajax({
		type: "POST",
		async: false,
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "FINAN" }, 
		success: function (lista_dev) {
			 
			if (lista_dev.length > 0) {
				$.each(lista_dev, function (idxdv, itemdv) {
					dev_acum_inv = itemdv.MTO_DEVEN;
					dev_anio_inv = itemdv.DEV_ANIO1;
					pim_anio_inv = itemdv.MTO_PIM; 

					$("#val_pim").html(formMilesDec(pim_anio_inv));
					$("#val_avan").html(formMilesDec(dev_anio_inv));
					$("#val_efin").html(formMilesDec(dev_acum_inv));

					prim_dev_inv = itemdv.PER_PRIM_DEVENG; 
					ult_dev_inv = itemdv.PER_ULT_DEVENG; 

				});
			} 

		},

	});

	var fec_dev_1, fec_dev_2, fec_dev_3, fec_dev_4;

	$.ajax({
		type: "POST",
		async: false,
		url: "/invierteWS/Ssi/traeFonafeSSI",
		//url: "/invierteWS/Ssi/traeFonafeSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "FINAN" },
		success: function (lista_fd) {

			$.each(lista_fd, function (idxf, itemf) {
				dev_acum_inv += itemf.sumaTotalEjecAlMes;
				dev_anio_inv += itemf.totalEjecutadoAlMes;
				pim_anio_inv += itemf.pimHistoricoPorAnio; 

				$("#val_pim").html(formMilesDec(pim_anio_inv));
				$("#val_avan").html(formMilesDec(dev_anio_inv));
				$("#val_efin").html(formMilesDec(dev_acum_inv));

				if (itemf.enero > 0) {
					fec_dev_4 = itemf.anioEje + '01';
				}

				if (itemf.febrero > 0 && itemf.mesEje > 1) {
					fec_dev_4 = itemf.anioEje + '02';
				}

				if (itemf.marzo > 0 && itemf.mesEje > 2) {
					fec_dev_4 = itemf.anioEje + '03';
				}

				if (itemf.abril > 0 && itemf.mesEje > 3) {
					fec_dev_4 = itemf.anioEje + '04';
				}

				if (itemf.mayo > 0 && itemf.mesEje > 4) {
					fec_dev_4 = itemf.anioEje + '05';
				}

				if (itemf.junio > 0 && itemf.mesEje > 5) {
					fec_dev_4 = itemf.anioEje + '06';
				}

				if (itemf.julio > 0 && itemf.mesEje > 6) {
					fec_dev_4 = itemf.anioEje + '07';
				}

				if (itemf.agosto > 0 && itemf.mesEje > 7) {
					fec_dev_4 = itemf.anioEje + '08';
				}

				if (itemf.septiembre > 0 && itemf.mesEje > 8) {
					fec_dev_4 = itemf.anioEje + '09';
				}

				if (itemf.octubre > 0 && itemf.mesEje > 9) {
					fec_dev_4 = itemf.anioEje + '10';
				}

				if (itemf.noviembre > 0 && itemf.mesEje > 10) {
					fec_dev_4 = itemf.anioEje + '11';
				}

				if (itemf.diciembre > 0 && itemf.mesEje > 11) {
					fec_dev_4 = itemf.anioEje + '12';
				}

				if (prim_dev_inv.length == 6) {
					fec_dev_1 = prim_dev_inv;
					fec_dev_2 = convFecPeriodo(itemf.fechaPrimerDevengado);
					fec_dev_3 = ult_dev_inv;

					if (fec_dev_2 < fec_dev_1) {
						prim_dev_inv = fec_dev_2; 
					}

					if (fec_dev_4 > fec_dev_3) {
						ult_dev_inv = fec_dev_4;
					}
				} else {
					prim_dev_inv = convFecPeriodo(itemf.fechaPrimerDevengado);
					ult_dev_inv = convFecPeriodo(itemf.fechaFinDevengado);  
				} 


				$("#des_inf_finan").html('&nbsp I. INFORMACIÓN FINANCIERA - EMPRESAS PUBLICAS ' + ' (S/)');
				 
			}); 

		},

	});


	$.ajax({
		type: "POST",
		async: false,
		url: "/invierteWS/Ssi/traeFonafeSSI",
		//url: "/invierteWS/Ssi/traeFonafeSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "ANIO" },
		success: function (lista_f) {
			listAnioFon = lista_f; 

		},

	});

	var lis_fon_bus = [];
	var dev_acum_fon = 0, pim_acum_fon = 0, anio_ant_fon = 1;

	$.ajax({
		type: "POST",
		async: false,
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "DEV2" },
		success: function (lis_anio_dev) {
			devenArray = []; pimtArray = []; anioArray = []; listAnio = [];
			listAnio = lis_anio_dev;
			html_dev1 = ''; html_devhis_res = '';

			html_devhis_res += '<tr style="font-weight: bold;"><th width = "7%" > AÑO</th >';
			html_devhis_res += '<th width="17%"> PIA</th><th width="17%"> PIM</th><th width="17%"> CERTIFICACIÓN</th>';
			html_devhis_res += '<th width="17%"> COMPROMISO ANUAL</th><th width="17%"> DEVENGADO</th><th width="8%"> ORIGEN</th></tr>';

			$.each(listAnio, function (idxf, itemf) {

				html_dev1 += '<tr class="fil_hisfinan">';
				html_dev1 += '<td style="font-weight:bold; ">' + itemf.NUM_ANIO + '</td>';
				html_dev1 += '<td>' + formMilesDec(itemf.MTO_PIA) + '</td>';
				html_dev1 += '<td>' + formMilesDec(itemf.MTO_PIM) + '</td>';
				html_dev1 += '<td>' + formMilesDec(itemf.MTO_CERT) + '</td>';
				html_dev1 += '<td>' + formMilesDec(itemf.MTO_COMPROM) + '</td>';
				html_dev1 += '<td>' + formMilesDec(itemf.MTO_DEVEN) + '</td>';
				html_dev1 += '<td>' + itemf.DES_TIPO + '</td>';
				html_dev1 += '<td> </td></tr>';
				 
				html_devhis_res += '<tr><td>' + itemf.NUM_ANIO + '</td>';
				html_devhis_res += '<td>' + formMilesDec(itemf.MTO_PIA) + '</td>';
				html_devhis_res += '<td>' + formMilesDec(itemf.MTO_PIM) + '</td>';
				html_devhis_res += '<td>' + formMilesDec(itemf.MTO_CERT) + '</td>';
				html_devhis_res += '<td>' + formMilesDec(itemf.MTO_COMPROM) + '</td>';
				html_devhis_res += '<td>' + formMilesDec(itemf.MTO_DEVEN) + '</td>';
				html_devhis_res += '<td>' + itemf.DES_TIPO + '</td></tr>';

			});

			$.each(lis_anio_dev, function (idxf, itemf) {
				if (itemf.MTO_DEVEN > 0 || itemf.MTO_PIM > 0) { 
					if ($.inArray(itemf.NUM_ANIO, anioArray) == -1) {
						anioArray.push(itemf.NUM_ANIO);

						dev_acum_fon = itemf.MTO_DEVEN;
						pim_acum_fon = itemf.MTO_PIM; 
						lis_fon_bus = [];
						lis_fon_bus = listAnio.filter(function (list) { return list.NUM_ANIO == itemf.NUM_ANIO && list.DES_TIPO != itemf.DES_TIPO; });

						if (lis_fon_bus.length == 0) {
							devenArray.push(dev_acum_fon);
							pimtArray.push(pim_acum_fon); 
						}

					} else {
						dev_acum_fon += itemf.MTO_DEVEN;
						pim_acum_fon += itemf.MTO_PIM;

						devenArray.push(dev_acum_fon);
						pimtArray.push(pim_acum_fon);
					} 

					anio_ant_fon = itemf.NUM_ANIO;


				}

			});


			if (html_dev1 != '') {
				$("#tb_hist_anual").html(html_dev1);
				$("#tb_hist_anual_res").html(html_devhis_res);

				$('#div05').show();
				$('#legend02').show();
			} else {
				$('#div05').hide();
				$('#legend02').hide();
			}

			GrafBarDeven();

		},

	});


	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeDevengSSI",
		//url: "/invierteWS/Ssi/traeDevengSSIBI",
		dataType: "json",
		data: { id: inv_cu, tipo: "MES" },
		//data: JSON.stringify(),
		success: function (lista_mes) {
			listMesDev = lista_mes;
			html_mes = '';
			hist_Anio = [];

			$.each(lista_mes, function (idxf, itemf) {
				anio_dev = $.trim(itemf.NUM_ANIO);

				if ($.inArray(anio_dev, hist_Anio) == -1) { hist_Anio.push(anio_dev); }

			});

			$.each(hist_Anio, function (idxf, itemf) {

				listDevInv = [];
				dev_mes1 = ''; dev_mes2 = ''; dev_mes3 = ''; dev_mes4 = ''; dev_mes5 = ''; dev_mes6 = ''; dev_mes7 = '';
				dev_mes8 = ''; dev_mes9 = ''; dev_mes10 = ''; dev_mes11 = ''; dev_mes12 = '';

				listDevInv = listMesDev.filter(function (list) { return list.NUM_ANIO == itemf; });

				$.each(listDevInv, function (idx_m, item_m) {

					switch (item_m.COD_MES) {
						case 1: dev_mes1 = item_m.MTO_DEVEN; break;
						case 2: dev_mes2 = item_m.MTO_DEVEN; break;
						case 3: dev_mes3 = item_m.MTO_DEVEN; break;
						case 4: dev_mes4 = item_m.MTO_DEVEN; break;
						case 5: dev_mes5 = item_m.MTO_DEVEN; break;
						case 6: dev_mes6 = item_m.MTO_DEVEN; break;
						case 7: dev_mes7 = item_m.MTO_DEVEN; break;
						case 8: dev_mes8 = item_m.MTO_DEVEN; break;
						case 9: dev_mes9 = item_m.MTO_DEVEN; break;
						case 10: dev_mes10 = item_m.MTO_DEVEN; break;
						case 11: dev_mes11 = item_m.MTO_DEVEN; break;
						case 12: dev_mes12 = item_m.MTO_DEVEN; break;
					}

				});

				html_mes += '<tr class="fil_hisfinan"><td>' + itemf + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes1) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes2) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes3) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes4) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes5) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes6) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes7) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes8) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes9) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes10) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes11) + '</td>';
				html_mes += '<td>' + formMilesDec(dev_mes12) + '</td>';
				html_mes += '<td>SIAF</td></tr>';

			});

			$.each(listAnioFon, function (idxf, itemf) {

				html_mes += '<tr class="fil_hisfinan"><td>' + itemf.anioEje + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.enero) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.febrero) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.marzo) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.abril) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.mayo) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.junio) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.julio) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.agosto) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.septiembre) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.octubre) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.noviembre) + '</td>';
				html_mes += '<td>' + formMilesDec(itemf.diciembre) + '</td>';
				html_mes += '<td>FONAFE</td></tr>';
			});

			/*
			if (hist_Anio.length == 0 && listAnioFon.length > 0) { 
				$.each(listAnioFon, function (idxf, itemf) { 

					html_mes += '<tr class="fil_hisfinan"><td>' + itemf.anioEje + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.enero) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.febrero) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.marzo) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.abril) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.mayo) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.junio) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.julio) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.agosto) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.septiembre) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.octubre) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.noviembre) + '</td>';
					html_mes += '<td>' + formMilesDec(itemf.diciembre) + '</td>';
					html_mes += '<td>FONAFE</td></tr>';
				});

			}
			*/

			$("#tb_devmes").html(html_mes);

		},

	});



}

function most_cie_bre(inv_cu) {
	var des_glosa_rest, des_glosa_pend, fec_eval;

	$.ajax({
		type: "POST",
		// async: false,
		url: "/invierteWS/Ssi/traeCierreBrecha",
		dataType: "json",
		data: { id: inv_cu, tipo: "BRE" },
		success: function (listaCB) { 
			$.each(listaCB, function (idx, item) {
				fec_eval = convFecNum(item.FEC_CREA);

				$("#td_indcie").html(item.DES_BRECHA);
				$("#td_estind").html(item.EST_CIE_BRE);
				$("#td_umind").html(item.DES_UM);
				$("#td_valcie").html(item.VAL_CIERRE_BRECHA_F9);
				$("#td_etaverif").html(item.IND_CIE_BRE);
				$("#td_feceval").html(fec_eval);

				$("#td_indcie_r").html(item.DES_BRECHA);
				$("#td_estind_r").html(item.EST_CIE_BRE);
				$("#td_umind_r").html(item.DES_UM);
				$("#td_valcie_r").html(item.VAL_CIERRE_BRECHA_F9);
				$("#td_etaverif_r").html(item.IND_CIE_BRE);
				$("#td_feceval_r").html(fec_eval);

				des_glosa_rest = item.DES_GLOSA_REST;
				des_glosa_pend = item.DES_GLOSA_PEND;

				if (item.DES_GLOSA_REST) {
					ind_cie_rest = 1;
					dias_ciebre = item.NUM_DIAS_REST;
					des_cie_pend = item.DES_GLOSA_REST;
				} else {
					if (item.DES_GLOSA_PEND) {
						ind_cie_pend = 1;
						dias_ciebre = item.NUM_DIAS_PEND;
						des_cie_pend = item.DES_GLOSA_PEND;
					}
				}

				if (des_cie_pend != '') {
					$("#img_desactiv").attr("src", "../Content/img/cierre.gif");
					$("#img_desactiv").attr("title", "Aviso de Cierre");
					$("#txt_desactiv").html(des_cie_pend);
					$("#txt_desactiv").css("color", "#A52A2A");

				} 
				 
			});


		},

	});

}

function most_perd_vig(inv_cu, tip_inv) {
	des_perd_vig = ''; 

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/traeAlertaPerdViab",
		dataType: "json",
		data: { id: inv_cu, tipo: tip_inv },
		success: function (listaPV) {
			$.each(listaPV, function (idxV, itemV) {

				des_perd_vig = itemV.DES_ALERTA_VIAB;

				if (des_perd_vig != '') {

					if (dev_acum_inv > 1) {
						$("#img_desactiv").attr("src", "../Content/img/perdvig_ejec.gif");
						$("#txt_desactiv").css("color", "#0093F8");
					}
					else {
						$("#img_desactiv").attr("src", "../Content/img/desactivar.gif");
						$("#txt_desactiv").css("color", "#FF0000");
					}

					$("#img_desactiv").attr("title", "");
					$("#txt_desactiv").html(des_perd_vig);

					if (itemV.TIP_INV == 'IOARR') {
						$("#img_desactiv").attr("title", "Cierre de IOARR");
					} else {
						$("#img_desactiv").attr("title", "Riesgo de Desactivación");
					}

				}


			});


		},

	});

}

function most_foniprel(inv_cu) {
	var html_foni = '', fec_pres_foni, ind_ganador;

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeFoniprelSSI",
		dataType: "json",
		data: { id: inv_cu, tipo: "FONI" },
		success: function (listaF) {

			html_foni = ''; html_foni_res = '';
			listFoni = [];
			listFoni = listaF;

			$.each(listFoni, function (idx, item) {
				fec_pres_foni = convFecNum(item.FEC_PRESENTACION);

				if (item.ID_PRODUCTO > 0) { ind_ganador = 'SI'; } else { ind_ganador = 'NO'; }

				html_foni += '<tr class="fil_infdet "><td width="25%" class="p-3 pt-2 pr-2 pb-2">  CONVOCATORIA</td>';
				html_foni += '<td width="25%" class="fil_infdet02 ">' + item.DES_CONVOCATORIA + '</td>';
				html_foni += '<td width="25%" style=" border-left: 4px solid #F7F7F7;"> EXPEDIENTE</td>';
				html_foni += '<td width="25%" class="fil_infdet02 ">' + item.DES_EXPEDIENTE + '</td></tr>';

				html_foni += '<tr class="fil_infdet"><td class="p-3 pt-2 pr-2 pb-2"> PRESENTACIÓN</td>';
				html_foni += '<td class="fil_infdet02 ">' + fec_pres_foni + '</td>';
				html_foni += '<td style=" border-left: 4px solid #F7F7F7;"> PRIORIDAD</td>';
				html_foni += '<td class="fil_infdet02 ">' + item.DES_PRIORIDAD + '</td></tr>';

				html_foni += '<tr class="fil_infdet"><td class="p-3 pt-2 pr-2 pb-2"> COSTO DE INVERSIÓN VIABLE (S/)</td>';
				html_foni += '<td class="fil_infdet02 ">' + formMilesDec(item.MONTO_PM_TOT) + '</td>';
				html_foni += '<td style=" border-left: 4px solid #F7F7F7;"> MONTO DEL CONFINANCIAMIENTO (S/)</td>';
				html_foni += '<td class="fil_infdet02 ">' + formMilesDec(item.MTO_COFINANCMTO) + '</td></tr>';

				html_foni += '<tr class="fil_infdet " style=" border-bottom: 1px solid #F2F2F2;">';
				html_foni += '<td class="p-3 pt-2 pr-2 pb-2">EVALUACIÓN</td>';
				html_foni += '<td class="fil_infdet02 ">' + item.DES_EVALUACION + '</td>';
				html_foni += '<td style=" border-left: 4px solid #F7F7F7;"> GANADOR</td>';
				html_foni += '<td class="fil_infdet02 "> ' + ind_ganador + '</td></tr>';

				html_foni += '<tr><td colspan="4"> </td></tr>';

				// VISTA RESUMEN					
				html_foni_res += '<tr><td width="25%" style="font-weight: bold;">CONVOCATORIA</td>';
				html_foni_res += '<td width="25%">' + item.DES_CONVOCATORIA + '</td>';
				html_foni_res += '<td width="25%" style="font-weight: bold;"> EXPEDIENTE</td><td width="25%" >' + item.DES_EXPEDIENTE + '</td></tr>';
				html_foni_res += '<tr><td style="font-weight: bold;">PRESENTACIÓN</td><td>' + fec_pres_foni + '</td>';
				html_foni_res += '<td style="font-weight: bold;"> PRIORIDAD</td><td>' + item.DES_PRIORIDAD + '</td></tr>';
				html_foni_res += '<tr><td style="font-weight: bold;">COSTO DE INVERSIÓN VIABLE (S/)</td><td>' + formMilesDec(item.MONTO_PM_TOT) + '</td>';
				html_foni_res += '<td style="font-weight: bold;"> MONTO DEL CONFINANCIAMIENTO (S/)</td><td>' + formMilesDec(item.MTO_COFINANCMTO) + '</td></tr>';
				html_foni_res += '<tr><td style="font-weight: bold;">EVALUACIÓN</td><td>' + item.DES_EVALUACION + '</td>';
				html_foni_res += '<td style="font-weight: bold;"> GANADOR</td><td>' + ind_ganador + '</td></tr> ';

				if ((idx + 1) != listFoni.length) {
					html_foni_res += '<tr style="border-left: hidden; border-right: hidden;"><td colspan="4"></td></tr>';
				}

			});

			if (html_foni != '') {
				$("#tb_foniprel").html(html_foni)
				$("#tb_foniprel_res").html(html_foni_res);

				$('#div_foniprel').show();
				$('#div_foniprel_res').show();
			} else {
				$('#div_foniprel').hide();
				$('#div_foniprel_res').hide();
			}

		},

	});

}

function most_paralizada(inv_cu) {
	var html_paral = '', fec_paraliz, fec_reg_paral;
	var url_informe_paral, url_resol_paral, num_obra, cnt_obra;

	$.ajax({
		type: "POST",
		url: "/invierte/paraliza/traeListaParalizaPublico",
		dataType: "json",
		data: { id: inv_cu },
		success: function (listaP) {
			html_paral = ''; html_paral_res = ''; cnt_obra = 0;
			listParal = [];
			listParal = listaP; 

			$.each(listParal, function (idx, item) {
				cnt_obra++;
				num_obra = obtNumRomano(cnt_obra);
				fec_reg_paral = convFecNum(item.FEC_CREA);

				html_paral += '<table class="table mb-1 tab_border" >';
				html_paral += '<tr class="tit_fase" style="border-top: hidden; ">';
				html_paral += '<td colspan="4"> &nbsp' + num_obra + '. OBRA ' + cnt_obra + '</td></tr>';
				html_paral += '</table> ';

				html_paral += '<table class="table mb-1" style=" border-radius: 1em 1em 0em 0em;  overflow:hidden;"> ';
				html_paral += '<tr class="tit_fase" style="border-top: hidden; "> ';
				html_paral += '<td colspan="4"> &nbsp V. REGISTRO DE OBRAS PARALIZADAS  (LEY N° 31589 Y SUS MODIFICATORIAS)</td>  </tr>';
				html_paral += '<tr class="fil_infdet "> <td width="25%" class="p-3 pt-2 pr-2 pb-2">  FECHA DE REGISTRO</td>';
				html_paral += '<td width="25%" id="td_fec_reg_par" class="fil_infdet02 ">  ' + fec_reg_paral + ' </td>';
				html_paral += '<td width="25%" style=" border-left: 4px solid #F7F7F7;">CÓDIGO INFOBRAS</td> ';
				html_paral += '<td width="25%" id="td_codpar" class="fil_infdet02 "> ' + item.COD_INFO_OBRAS + ' </td>  </tr>';
				html_paral += '<tr class="fil_infdet"> <td class="p-3 pt-2 pr-2 pb-2" style=" border-left: 4px solid #F7F7F7;"> DESCRIPCIÓN DE LA OBRA</td>';
				html_paral += ' <td colspan="3" id="td_desobra" class="fil_infdet02 ">' + item.DES_NOMBRE_OBRA + '  </td>  </tr>';
				html_paral += '<tr class="fil_infdet "> <td class="p-3 pt-2 pr-2 pb-2"> MODALIDAD</td>';
				html_paral += '</table> ';
				html_paral += '</table> ';
				html_paral += '</table> ';
				html_paral += '</table> ';
				html_paral += '</table> ';
				html_paral += '</table> ';


				$("#td_codpar").html(item.COD_INFO_OBRAS);
				$("#td_desobra").html(item.DES_NOMBRE_OBRA);
				$("#td_modalpar").html(item.DES_MODALIDAD);
				$("#td_avanfispar").html(item.VAL_AVANCE_FISICO + ' %');
				$("#td_motivopar").html(item.DES_MOTIVO); 
				$("#td_est_situac").html(item.DES_ESTADO);

				if (item.URL_DOC_INFORME) {
					url_informe_paral = 'https://ofi5.mef.gob.pe/invierte/general/downloadArchivo?idArchivo=' + item.URL_DOC_INFORME;
					$("#td_informe_par").html('<a href="' + url_informe_paral + '" target="_blank" >' + item.NUM_INFORME + '</a>');
				} else {
					$("#td_informe_par").html('No registrado');
				}
				if (item.NUM_RESOLUCION) {
					url_resol_paral = 'https://ofi5.mef.gob.pe/invierte/general/downloadArchivo?idArchivo=' + item.URL_RESOLUCION;
					$("#td_resol_par").html('<a href="' + url_resol_paral + '" target="_blank" >' + item.NUM_RESOLUCION + '</a>');
				} else {
					$("#td_resol_par").html('No registrado');
				}
				

				fec_paraliz = convFecNum(item.FEC_PARALIZA);
				$("#td_fecparal").html(fec_paraliz);

				fec_reg_paral = convFecNum(item.FEC_CREA);
				$("#td_fec_reg_par").html(fec_reg_paral);

				html_paral += '<tr></tr>';

				$("#td_codpar_r").html(item.COD_INFO_OBRAS);
				$("#td_desobra_r").html(item.DES_NOMBRE_OBRA);
				$("#td_modalpar_r").html(item.DES_MODALIDAD);
				$("#td_avanfispar_r").html(item.VAL_AVANCE_FISICO + ' %');
				$("#td_motivopar_r").html(item.DES_MOTIVO);
				$("#td_fecparal_r").html(fec_paraliz);
				$("#td_fec_reg_par_r").html(fec_reg_paral);
				$("#td_informe_par_r").html('<a href="' + url_informe_paral + '" target="_blank" >' + item.NUM_INFORME + '</a>');
				$("#td_resol_par_r").html('<a href="' + url_resol_paral + '" target="_blank" >' + item.NUM_RESOLUCION + '</a>');
				$("#td_est_situac_r").html(item.DES_ESTADO);

			});

			if (html_paral != '') {
				$('#div_paraliza').show();
				$('#div_paraliza_res').show();

			} else {
				$('#div_paraliza').hide();
				$('#div_paraliza_res').hide();
			}

		},

	});

}

function most_infobras(inv_snip) {

	var html_infobra = '', html_avan = '', cnt_obra = 0, cnt_avan = 0;
	var fec_infobra, num_obra, fec_ini_obra, per_obra;
	var lis_avanobra = [], est_obra;

	$.ajax({
		type: "GET",
		url: "/ssi/Ssi/verInfObras2/" + inv_snip,
		dataType: "json",
		data: JSON.stringify(),
		success: function (lis_obras) {

			lis_infobra = lis_obras;
			lis_avanobra = [];
			html_infobra = ''; html_infobra_res = ''; cnt_obra = 0;

			$.each(lis_infobra, function (idx, item) {

				html_avan = ''; html_avanob_res = ''; est_obra = '';
				cnt_avan = 0;  lis_avanobra = [];
				lis_avanobra = item.obj_SNO_AVANCE;

				/*
				$.each(lis_avanobra, function (idx_av, item_av) {
					cnt_avan++;
					est_obra = item_av.COBA_ESTREG;
					fec_infobra = convFecNum(item_av.DOBA_FCHREP);

					if (item_av.NOBA_MES < 10) {
						per_obra = item_av.NOBA_ANIO + '-0' + item_av.NOBA_MES
					} else {
						per_obra = item_av.NOBA_ANIO + '-' + item_av.NOBA_MES
					}

					if (item_av.COBA_ESTREG == "2") { est_obra = "PUBLICADO"; } else { est_obra = "SIN PUBLICAR"; }

					html_avan += '<tr class=" fil_hisfinan"><td style="font-weight:bold;">' + cnt_avan + '</td>';
					html_avan += '<td>' + per_obra + '</td>';
					html_avan += '<td>' + fec_infobra + '</td>';
					html_avan += '<td>' + item_av.NOBA_FISICO_PRO + '</td>';
					html_avan += '<td>' + item_av.NOBA_FISICO_REA + '</td>';
					html_avan += '<td>' + formMilesDec(item_av.NOBA_VALZDO_PRO) + '</td>';
					html_avan += '<td>' + formMilesDec(item_av.NOBA_VALZDO_REA) + '</td> </tr>';

					html_avanob_res += '<tr><td width="10%">' + cnt_avan + '</td>';
					html_avanob_res += '<td width="15%">' + per_obra + '</td>';
					html_avanob_res += '<td width="15%">' + fec_infobra + '</td>';
					html_avanob_res += '<td width="15%">' + item_av.NOBA_FISICO_PRO + '</td>';
					html_avanob_res += '<td width="15%">' + item_av.NOBA_FISICO_REA + '</td>';
					html_avanob_res += '<td width="15%">' + formMilesDec(item_av.NOBA_VALZDO_PRO) + '</td>';
					html_avanob_res += '<td width="15%">' + formMilesDec(item_av.NOBA_VALZDO_REA) + '</td> </tr>';

				});

				*/

				cnt_obra++;
				num_obra = obtNumRomano(cnt_obra);
				fec_ini_obra = convFecNum(item.DOBR_FEC_INI_OBRA);

				//html_infobra += '<div class="table-responsive">';
				html_infobra += '<table class="table mb-1 tab_border" >';
				html_infobra += '<tr class="tit_fase" style="border-top: hidden; ">';
				html_infobra += '<td colspan="4"> &nbsp' + num_obra + '. OBRA ' + cnt_obra + '</td></tr>';
				html_infobra += '</table> ';

				//html_infobra += '<div class="table-responsive">';
				html_infobra += '<table class="table mb-3 tab_border" ><thead>';
				html_infobra += '<tr class="tit_tabla" style="text-align:left;"><th colspan="4" style="font-weight: normal;"> 1. DATOS GENERALES</th></tr></thead>';

				html_infobra += '<tbody><tr class="fil_infdet "><td width="25%" class="p-3 pt-2 pr-2 pb-2">  CÓDIGO INFOBRAS</td>';
				html_infobra += '<td width="75%" colspan="3" class="fil_infdet02 ">' + item.NOBR_ID + '</td></tr>';
				html_infobra += '<tr class="fil_infdet"><td class="p-3 pt-2 pr-2 pb-2" style=" border-left: 4px solid #F7F7F7;"> NOMBRE DE LA OBRA</td>';
				html_infobra += '<td colspan="3" class="fil_infdet02 ">' + item.COBR_DESCRI + '</td></tr>';
				html_infobra += '<tr class="fil_infdet "><td class="p-3 pt-2 pr-2 pb-2">  MODALIDAD DE EJECUCIÓN</td>';
				html_infobra += '<td colspan="3" class="fil_infdet02 ">' + item.COPA_DESCRI + '</td></tr>';
				html_infobra += '<tr class="fil_infdet "><td width="25%" class="p-3 pt-2 pr-2 pb-2"> UBICACIÓN DE LA OBRA</td>';
				html_infobra += '<td width="75%" colspan="3" class="fil_infdet02 ">' + item.COBR_DIRECCION + '</td></tr>';
				html_infobra += '<tr class="fil_infdet "><td class="p-3 pt-2 pr-2 pb-2">  UNIDAD EJECUTORA DE INVERSIONES</td>';
				html_infobra += '<td colspan="3" class="fil_infdet02 ">' + item.CODCONSUCODE_DESCRI + '</td></tr>';
				html_infobra += '<tr class="fil_infdet "> <td width="25%" class="p-3 pt-2 pr-2 pb-2"> ESTADO DE LA OBRA</td>';
				html_infobra += '<td width="75%" colspan="3" class="fil_infdet02 ">' + est_obra + '</td></tr>';
				html_infobra += '<tr class="fil_infdet " style=" border-bottom: 1px solid #F2F2F2;"><td width="25%" class="p-3 pt-2 pr-2 pb-2"> MONTO DE CONTRATO EN S/.</td>';
				html_infobra += '<td width="25%" class="fil_infdet02 ">' + formMilesDec(item.NSNP_MONTOAPR) + '</td>';
				html_infobra += '<td width="25%" style=" border-left: 4px solid #F7F7F7;"> FECHA DE INICIO DE OBRA</td>';
				html_infobra += '<td width="25%" class="fil_infdet02 ">' + fec_ini_obra + '</td></tr></tbody></table>  ';

				/*
				//html_infobra += '<div class="table-responsive">';
				html_infobra += '<table class="table mb-1 tab_border"><thead>';
				html_infobra += '<tr class="tit_tabla" style="text-align:left;"><th colspan="7" style="font-weight: normal;"> 2. AVANCE FÍSICO DE LA OBRA</th></tr>';
				html_infobra += '<tr class="avan_infob" style=" vertical-align:middle; ">';
				html_infobra += '<th width="10%" rowspan="2"> N°</th>';
				html_infobra += '<th width="15%" rowspan="2" style="border-left: 2px solid #F7F7F7; ">PERIODO  DE VALORIZACIÓN</th>';
				html_infobra += '<th width="15%" rowspan="2" style="border-left: 2px solid #F7F7F7; ">FECHA DE REGISTRO</th>';
				html_infobra += '<th colspan="2" style="border-left: 2px solid #F7F7F7; border-bottom: 2px solid #F7F7F7; "> AVANCE FÍSICO ACUMULADO (%)</th>';
				html_infobra += '<th colspan="2" style="border-left: 2px solid #F7F7F7; border-bottom: 2px solid #F7F7F7;"> AVANCE VALORIZADO ACUMULADO (S/)</th> </tr>';
				html_infobra += '<tr class="avan_infob" style=" vertical-align:middle; "><th width="15%" style="border-left: 2px solid #F7F7F7; "> PROGRAMADO</th>';
				html_infobra += '<th width="15%" style="border-left: 2px solid #F7F7F7; "> REAL</th>';
				html_infobra += '<th width="15%" style="border-left: 2px solid #F7F7F7; "> PROGRAMADO</th>';
				html_infobra += '<th width="15%" style="border-left: 2px solid #F7F7F7; "> REAL</th> </tr> </thead>';

				html_infobra += '<tbody>' + html_avan + '</tbody> </table>';
				html_avan
				*/
				html_infobra += ' <br/>';

				html_infobra_res += '<table class="table table-bordered mb-0"><thead><tr class="tit_resumen03" style="border-bottom: hidden;">';
				html_infobra_res += '<td id="td_cons_res" colspan="4">' + num_obra + '. OBRA ' + cnt_obra + '</td></tr ></thead> ';

				html_infobra_res += '<tbody style="text-align:left;"><tr style=" vertical-align:middle; font-weight: bold;">';
				html_infobra_res += '<th colspan="4" style="text-align:center;"> 1. DATOS GENERALES</th></tr>';
				html_infobra_res += '<tr><td width="25%" style="font-weight:bold;">CÓDIGO INFOBRAS</td><td width="75%" colspan="3">' + item.NOBR_ID + '</td></tr>';
				html_infobra_res += '<tr><td style="font-weight:bold;"> NOMBRE DE LA OBRA</td><td colspan="3">' + item.COBR_DESCRI + '</td></tr>';
				html_infobra_res += '<tr><td style="font-weight:bold;"> MODALIDAD DE EJECUCIÓN</td><td colspan="3">' + item.COPA_DESCRI + '</td></tr>';
				html_infobra_res += '<tr><td style="font-weight:bold;"> UBICACIÓN DE LA OBRA</td><td colspan="3">' + item.COBR_DIRECCION + '</td></tr>';
				html_infobra_res += '<tr><td style="font-weight:bold;"> UNIDAD EJECUTORA DE INVERSIONES</td><td colspan="3">' + item.CODCONSUCODE_DESCRI + '</td></tr>';
				html_infobra_res += '<tr><td style="font-weight:bold;"> ESTADO DE LA OBRA</td><td colspan="3">' + est_obra + '</td></tr>';
				html_infobra_res += '<tr><td width="25%" style="font-weight:bold;"> MONTO DE CONTRATO EN S/.</td>';
				html_infobra_res += '<td width="25%">' + formMilesDec(item.NSNP_MONTOAPR) + '</td>';
				html_infobra_res += '<td width="25%" style="font-weight:bold;"> FECHA DE INICIO DE OBRA </td>';
				html_infobra_res += '<td width="25%">' + fec_ini_obra + '</td></tr></tbody></table>';

				/*
				html_infobra_res += '<table class="table table-bordered mb-0"><tbody style="text-align:center;">';
				html_infobra_res += '<tr style=" vertical-align:middle; font-weight: bold;">';
				html_infobra_res += '<th colspan="7"> 2. AVANCE FÍSICO DE LA OBRA</th></tr>';
				html_infobra_res += '<tr style="vertical-align:middle;"><th rowspan="2"> N°</th>';
				html_infobra_res += '<th rowspan="2" >PERIODO  DE VALORIZACIÓN</th>';
				html_infobra_res += '<th rowspan="2" >FECHA DE REGISTRO</th>';
				html_infobra_res += '<th colspan="2"> AVANCE FÍSICO ACUMULADO (%)</th>';
				html_infobra_res += '<th colspan="2"> AVANCE VALORIZADO ACUMULADO (S/)</th> </tr>';
				html_infobra_res += '<tr><th>PROGRAMADO</th> <th>REAL</th> <th>PROGRAMADO</th> <th>REAL</th> </tr>';

				html_infobra_res += html_avanob_res + '</tbody> </table>';
				*/

				html_infobra_res += html_avanob_res + ' <br/>';

			});

			if (html_infobra != '') {
				$("#div_infobras").html(html_infobra);

				$("#div_infobras_res").html(html_infobra_res);

			}

		},

	});




}

function most_seace(inv_cu, inv_snip) {
	var html_obra = '', html_serv = '', html_bien = '', html_consul = '';
	var des_item = '', contrta = '', num_contr = '', obj_contr, url_contr;
	var n_item, fec_susc, mto_tot, mto_item, url_contr_prev;

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/traeContratoSeaceDWH",
		dataType: "json",
		data: { id: inv_cu, codsnip: inv_snip, vers: "v2" },
		success: function (listaCU) {

			html_obra = ''; html_serv = ''; html_bien = ''; html_consul = '';
			html_obra_res = ''; html_serv_res = ''; html_bien_res = ''; html_cons_res = '';

			html_obra_res += '<tr style=" vertical-align:middle; font-weight: bold;"><th> N° DE ITEM</th>';
			html_obra_res += '<th>DESCRIPCIÓN DE ITEM</th><th>CONTRATISTA</th><th> N° CONTRATO</th>';
			html_obra_res += '<th> FECHA DE SUSCRIPCIÓN</th><th>MONTO CONTRATADO TOTAL (S/)</th>';
			html_obra_res += '<th> MONTO CONTRATADO ITEM TOTAL (S/)</th><th> VER CONTRATO</th></tr>';

			html_serv_res += '<tr style=" vertical-align:middle; font-weight: bold;"><th> N° DE ITEM</th>';
			html_serv_res += '<th>DESCRIPCIÓN DE ITEM</th><th>CONTRATISTA</th><th> N° CONTRATO</th>';
			html_serv_res += '<th> FECHA DE SUSCRIPCIÓN</th><th>MONTO CONTRATADO TOTAL (S/)</th>';
			html_serv_res += '<th> MONTO CONTRATADO ITEM TOTAL (S/)</th><th> VER CONTRATO</th></tr>';

			html_bien_res += '<tr style=" vertical-align:middle; font-weight: bold;"><th> N° DE ITEM</th>';
			html_bien_res += '<th>DESCRIPCIÓN DE ITEM</th><th>CONTRATISTA</th><th> N° CONTRATO</th>';
			html_bien_res += '<th> FECHA DE SUSCRIPCIÓN</th><th>MONTO CONTRATADO TOTAL (S/)</th>';
			html_bien_res += '<th> MONTO CONTRATADO ITEM TOTAL (S/)</th><th> VER CONTRATO</th></tr>';

			html_cons_res += '<tr style=" vertical-align:middle; font-weight: bold;"><th> N° DE ITEM</th>';
			html_cons_res += '<th>DESCRIPCIÓN DE ITEM</th><th>CONTRATISTA</th><th> N° CONTRATO</th>';
			html_cons_res += '<th> FECHA DE SUSCRIPCIÓN</th><th>MONTO CONTRATADO TOTAL (S/)</th>';
			html_cons_res += '<th> MONTO CONTRATADO ITEM TOTAL (S/)</th><th> VER CONTRATO</th></tr>';

			$.each(listaCU, function (idx, item) {

				des_item = item.DES_ITEM;
				n_item = item.NUM_ITEM;
				contrta = item.NOM_CONTRATISTA;
				num_contr = item.NUM_CONTRATO;
				fec_susc = item.FEC_SUSCRIPCION;
				mto_tot = formMilesDec(item.MTO_TOTAL);
				mto_item = formMilesDec(item.MTO_ITEM);
				url_contr_prev = item.URL_CONTRATO;
				obj_contr = item.OBJETO_CONTRATAC;

				if (url_contr_prev.substr(7, 23) == 'contratos.seace.gob.pe:') {
					url_contr = 'https://ofi5.mef.gob.pe/geoinvierte/proxy.ashx?' + url_contr_prev;
				} else {
					url_contr = url_contr_prev;
				} 

				switch (obj_contr.toUpperCase()) {
					case 'OBRA':
						html_obra += '<tr class="fil_hisfinan">';
						html_obra += '<td style="font-weight:bold;">' + n_item + '</td>';
						html_obra += '<td>' + des_item + '</td>';
						html_obra += '<td>' + contrta + '</td>';
						html_obra += '<td>' + num_contr + '</td>';
						html_obra += '<td>' + fec_susc + '</td>';
						html_obra += '<td>' + mto_tot + '</td>';
						html_obra += '<td>' + mto_item + '</td>';
						html_obra += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

						html_obra_res += '<tr><td width="8%">' + n_item + '</td>';
						html_obra_res += '<td width="25%">' + des_item + '</td>';
						html_obra_res += '<td width="12%">' + contrta + '</td>';
						html_obra_res += '<td width="13%">' + num_contr + '</td>';
						html_obra_res += '<td width="10%">' + fec_susc + '</td>';
						html_obra_res += '<td width="12%">' + mto_tot + '</td>';
						html_obra_res += '<td width="15%">' + mto_item + '</td>';
						html_obra_res += '<td width="5%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

						break;

					case 'SERVICIO':
						html_serv += '<tr class="fil_hisfinan">';
						html_serv += '<td style="font-weight:bold;">' + n_item + '</td>';
						html_serv += '<td>' + des_item + '</td>';
						html_serv += '<td>' + contrta + '</td>';
						html_serv += '<td>' + num_contr + '</td>';
						html_serv += '<td>' + fec_susc + '</td>';
						html_serv += '<td>' + mto_tot + '</td>';
						html_serv += '<td>' + mto_item + '</td>';
						html_serv += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

						html_serv_res += '<tr><td width="8%">' + n_item + '</td>';
						html_serv_res += '<td width="25%">' + des_item + '</td>';
						html_serv_res += '<td width="12%">' + contrta + '</td>';
						html_serv_res += '<td width="13%">' + num_contr + '</td>';
						html_serv_res += '<td width="10%">' + fec_susc + '</td>';
						html_serv_res += '<td width="12%">' + mto_tot + '</td>';
						html_serv_res += '<td width="15%">' + mto_item + '</td>';
						html_serv_res += '<td width="5%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

						break;

					case 'BIEN':
						html_bien += '<tr class="fil_hisfinan">';
						html_bien += '<td style="font-weight:bold;">' + n_item + '</td>';
						html_bien += '<td>' + des_item + '</td>';
						html_bien += '<td>' + contrta + '</td>';
						html_bien += '<td>' + num_contr + '</td>';
						html_bien += '<td>' + fec_susc + '</td>';
						html_bien += '<td>' + mto_tot + '</td>';
						html_bien += '<td>' + mto_item + '</td>';
						html_bien += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

						html_bien_res += '<tr><td width="8%">' + n_item + '</td>';
						html_bien_res += '<td width="25%">' + des_item + '</td>';
						html_bien_res += '<td width="12%">' + contrta + '</td>';
						html_bien_res += '<td width="13%">' + num_contr + '</td>';
						html_bien_res += '<td width="10%">' + fec_susc + '</td>';
						html_bien_res += '<td width="12%">' + mto_tot + '</td>';
						html_bien_res += '<td width="15%">' + mto_item + '</td>';
						html_bien_res += '<td width="5%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

						break;

					case 'CONSULTORÍA DE OBRA':
						html_consul += '<tr class="fil_hisfinan">';
						html_consul += '<td style="font-weight:bold;">' + n_item + '</td>';
						html_consul += '<td>' + des_item + '</td>';
						html_consul += '<td>' + contrta + '</td>';
						html_consul += '<td>' + num_contr + '</td>';
						html_consul += '<td>' + fec_susc + '</td>';
						html_consul += '<td>' + mto_tot + '</td>';
						html_consul += '<td>' + mto_item + '</td>';
						html_consul += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

						html_cons_res += '<tr><td width="8%">' + n_item + '</td>';
						html_cons_res += '<td width="25%">' + des_item + '</td>';
						html_cons_res += '<td width="12%">' + contrta + '</td>';
						html_cons_res += '<td width="13%">' + num_contr + '</td>';
						html_cons_res += '<td width="10%">' + fec_susc + '</td>';
						html_cons_res += '<td width="12%">' + mto_tot + '</td>';
						html_cons_res += '<td width="15%">' + mto_item + '</td>';
						html_cons_res += '<td width="5%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

						break;

				}

				$("#dv_seace_1").show();
				$("#dv_seace_2").show();
				$("#dv_seace_3").show();
				$("#dv_seace_4").show();


			});

			var num_seace, cnt_oc = 0;

			if (html_obra != '') {
				$("#tb_seaceobra").html(html_obra);

				cnt_oc++;

				$("#tb_seaceobra_res").html(html_obra_res);

			} else {
				$("#dv_seace_1").hide();

				$("#tit_obra_res").hide();
			}

			if (html_serv != '') {
				$("#tb_seaceserv").html(html_serv);

				cnt_oc++;
				num_seace = obtNumRomano(cnt_oc);

				$("#td_oc_2").html('&nbsp ' + num_seace + '. SERVICIO');

				$("#tb_seaceserv_res").html(html_serv_res);
				$("#td_serv_res").html(num_seace + '. SERVICIO');

			} else {
				$("#dv_seace_2").hide();

				$("#tit_serv_res").hide();
			}

			if (html_bien != '') {
				$("#tb_seacebien").html(html_bien);

				cnt_oc++;
				num_seace = obtNumRomano(cnt_oc);

				$("#td_oc_3").html('&nbsp ' + num_seace + '. BIENES');

				$("#tb_seacebien_res").html(html_bien_res);
				$("#td_bien_res").html(num_seace + '. BIENES');

			} else {
				$("#dv_seace_3").hide();

				$("#tit_bien_res").hide();
			}

			if (html_consul != '') {
				$("#tb_seaceconsul").html(html_consul);

				cnt_oc++;
				num_seace = obtNumRomano(cnt_oc);

				$("#td_oc_4").html('&nbsp ' + num_seace + '. CONSULTORÍA DE OBRA');

				$("#tb_seaceconsul_res").html(html_cons_res);
				$("#td_cons_res").html(num_seace + '. CONSULTORÍA DE OBRA');

			} else {
				$("#dv_seace_4").hide();

				$("#tit_cons_res").hide();
			}

		},

	});

	 
 
}

function most_oxi(inv_cu) {
	var html_oxi = '', html_oxi_2 = '', html_oxi_3 = '';
	var des_ctrto = '', ent_superv = '', tip_doc = '', obj_contr, url_contr;
	var n_anio, tip_reg = '', fec_susc, mto_tot;
	 

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/traeListaConvOXI",
		dataType: "json",
		data: { id: inv_cu },
		success: function (lisOXI) {

			html_oxi = '';
			html_oxi_2 = '';
			html_oxi_3 = '';
			html_oxi_res = '';
			html_oxi_res_2 = '';
			html_oxi_res_3 = '';

			html_oxi_res += '<tr style=" vertical-align:middle; font-weight: bold;"><th> AÑO BUENA PRO</th>';
			html_oxi_res += '<th> EMPRESA PRIVADA </th><th> TIPO DOCUMENTO</th>';
			html_oxi_res += '<th> FECHA</th><th>MONTO TOTAL INVERSION (S/)</th>';
			html_oxi_res += '<th> VER DOCUMENTO</th></tr>';

			html_oxi_res_2 += '<tr style=" vertical-align:middle; font-weight: bold;"><th> AÑO BUENA PRO</th>';
			html_oxi_res_2 += '<th>ENTIDAD PRIVADA SUPERVISORA</th><th> TIPO DOCUMENTO</th>';
			html_oxi_res_2 += '<th> FECHA</th><th>MONTO TOTAL INVERSION (S/)</th>';
			html_oxi_res_2 += '<th> VER DOCUMENTO</th></tr>';

			html_oxi_res_3 += '<tr style=" vertical-align:middle; font-weight: bold;"><th> AÑO BUENA PRO</th>';
			html_oxi_res_3 += '<th>EMPRESA FINANCISTA</th><th> TIPO DOCUMENTO</th>'; 
			html_oxi_res_3 += '<th> VER DOCUMENTO</th></tr>';

			$.each(lisOXI, function (idx_oxi, item_oxi) {

				n_anio = item_oxi.ANIO_BUENA_PRO;
				des_ctrto = item_oxi.NOM_INVERSION;
				ent_superv = item_oxi.ENTIDAD_SUPERVISORA;
				tip_doc = item_oxi.TIP_DOCUMENTO;
				tip_reg = item_oxi.TIPO_REG;
				fec_susc = convFecNum(item_oxi.FEC_DOCUMENTO);
				mto_tot = formMilesDec(item_oxi.MTO_INVERS_CTRT);
				url_contr = item_oxi.URL_DOCUM; 


				if (tip_reg == 'OTROS') {
					html_oxi_3 += '<tr class="fil_hisfinan">';
					html_oxi_3 += '<td style="font-weight:bold;">' + n_anio + '</td>';
					html_oxi_3 += '<td>' + ent_superv + '</td>';
					html_oxi_3 += '<td>' + tip_doc + '</td>'; 
					html_oxi_3 += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

					html_oxi_res_3 += '<tr><td width="10%">' + n_anio + '</td>';
					html_oxi_res_3 += '<td width="25%">' + ent_superv + '</td>';
					html_oxi_res_3 += '<td width="20%">' + tip_doc + '</td>'; 
					html_oxi_res_3 += '<td width="10%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

					$("#dv_oxi_3").show();

				} else {

					if (tip_doc.indexOf("SUPERVIS") > 1) {
						html_oxi_2 += '<tr class="fil_hisfinan">';
						html_oxi_2 += '<td style="font-weight:bold;">' + n_anio + '</td>';
						html_oxi_2 += '<td>' + ent_superv + '</td>';
						html_oxi_2 += '<td>' + tip_doc + '</td>';
						html_oxi_2 += '<td>' + fec_susc + '</td>';
						html_oxi_2 += '<td>' + mto_tot + '</td>';
						html_oxi_2 += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

						html_oxi_res_2 += '<tr><td width="10%">' + n_anio + '</td>';
						html_oxi_res_2 += '<td width="25%">' + ent_superv + '</td>';
						html_oxi_res_2 += '<td width="20%">' + tip_doc + '</td>';
						html_oxi_res_2 += '<td width="15%">' + fec_susc + '</td>';
						html_oxi_res_2 += '<td width="20%">' + mto_tot + '</td>';
						html_oxi_res_2 += '<td width="10%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

						$("#dv_oxi_2").show();

					} else {
						html_oxi += '<tr class="fil_hisfinan">';
						html_oxi += '<td style="font-weight:bold;">' + n_anio + '</td>';
						html_oxi += '<td>' + ent_superv + '</td>';
						html_oxi += '<td>' + tip_doc + '</td>';
						html_oxi += '<td>' + fec_susc + '</td>';
						html_oxi += '<td>' + mto_tot + '</td>';
						html_oxi += '<td><a href="' + url_contr + '" target= "_blank" ><img class="img_histf" src = "../Content/img/pdf.png" /></a></td></tr>';

						html_oxi_res += '<tr><td width="10%">' + n_anio + '</td>';
						html_oxi_res += '<td width="25%">' + ent_superv + '</td>';
						html_oxi_res += '<td width="20%">' + tip_doc + '</td>';
						html_oxi_res += '<td width="15%">' + fec_susc + '</td>';
						html_oxi_res += '<td width="20%">' + mto_tot + '</td>';
						html_oxi_res += '<td width="10%"><a href="' + url_contr + '" target= "_blank" ><img src = "../Content/img/pdf.png" /></a></td></tr>';

						$("#dv_oxi_1").show();
					}

				}
				
			});
			 

			if (html_oxi != '') {
				$("#tb_oxi_conv").html(html_oxi);
				$("#tb_oxi_res").html(html_oxi_res);

			} else {
				$("#dv_oxi_1").hide();
				$("#tit_oxi_res").hide();
			}

			if (html_oxi_2 != '') {
				$("#tb_oxi_ctto").html(html_oxi_2);
				$("#tb_oxi_res_2").html(html_oxi_res_2);

			} else {
				$("#dv_oxi_2").hide();
				$("#tit_oxi_res_2").hide();
			}

			if (html_oxi_3 != '') {
				$("#tb_oxi_otros").html(html_oxi_3);
				$("#tb_oxi_res_3").html(html_oxi_res_3);

			} else {
				$("#dv_oxi_3").hide();
				$("#tit_oxi_res_3").hide();
			}

		},

	});


}

function verif_geoinvierte(inv_cu) {
	var url_arc_gis = 'https://ws.mineco.gob.pe/server/rest/services/cartografia_pip_georef_edicion_lectura/MapServer/';
	var url_final = '&inSR=&spatialRel=esriSpatialRelIntersects&units=esriSRUnit_Foot&outFields=*&returnGeometry=false&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=true&returnZ=false&returnM=false&returnDistinctValues=false&returnExtentOnly=false&featureEncoding=esriDefault&f=JSON';
	var url_geoinv, des_mapa = '';

	$.ajax({
		type: "GET",
		url: url_arc_gis + '0/query?where=COD_UNICO%3D' + inv_cu + '&objectgeometryType=esriGeometryEnvelope' + url_final,
		dataType: "json",
		data: JSON.stringify(),
		success: function (lis_geo) {

			$.each(lis_geo, function (idx, item) {
				if (item > 0) {
					url_geoinv = 'https://ofi5.mef.gob.pe/geoinvierteportals/index.html?query=cartografia_pip_georef_edicion_lectura_7101,COD_UNICO,' + inv_cu;

					if ( vermovil ==0 ) { des_mapa = 'UBICACIÓN &nbsp '; }

					des_mapa += '<a href="' + url_geoinv + '" target= "_blank" > <img src = "../Content/img/mapa_geo.png" class="img_geoinv" /></a>';

					$("#td_mapa").html(des_mapa);
				}
			});


		},

	});

	$.ajax({
		type: "GET",
		url: url_arc_gis + '1/query?where=COD_UNICO%3D' + inv_cu + '&objectgeometryType=esriGeometryEnvelope' + url_final,
		dataType: "json",
		data: JSON.stringify(),
		success: function (lis_geo2) {

			$.each(lis_geo2, function (idx, item) {
				if (item > 0) {
					url_geoinv = 'https://ofi5.mef.gob.pe/geoinvierteportals/index.html?query=cartografia_pip_georef_edicion_lectura_8257,COD_UNICO,' + inv_cu;

					if (vermovil == 0) { des_mapa = 'UBICACIÓN &nbsp '; }

					des_mapa += '<a href="' + url_geoinv + '" target= "_blank" > <img src = "../Content/img/mapa_geo.png" class="img_geoinv" /></a>';

					$("#td_mapa").html(des_mapa);
				}
			});

		},

	});

	$.ajax({
		type: "GET",
		url: url_arc_gis + '2/query?where=COD_UNICO%3D' + inv_cu + '&objectgeometryType=esriGeometryEnvelope' + url_final,
		dataType: "json",
		data: JSON.stringify(),
		success: function (lis_geo3) {

			$.each(lis_geo3, function (idx, item) {
				console.log('poli: ' + item);

			});

		},

	});



	// INFORMES CONTROL

	if (cod_unico == '2151258999') {

		console.log('PASO 1');

		$.ajax({
			type: "GET",
			url: "/ssi/Ssi/verInformeControl/" + inv_cu,
			// url: "/invierteWS/Dashboard/verInformeControl/" + inv_cu,  

			dataType: "json",
			data: JSON.stringify(),
			success: function (lista) {

				console.log('PASO 2');
				console.log(lista);


			},
			error: function (xhr, ajaxOptions, thrownError) {

				alert('xhr: ' + xhr);
				alert('ajaxOptions: ' + ajaxOptions);
				alert('thrownErrors: ' + thrownError);
			}
		});

	}


	// FONAFE

	if (cod_unico == '2410789') {

		console.log('PASO F1');

		$.ajax({
			type: "GET",
			url: "/invierteWS/Ssi/traeDevenFonafeCU?id=" + inv_cu,
			// url: "/invierteWS/Dashboard/verInformeControl/" + inv_cu, 
			dataType: "json",
			data: JSON.stringify(),
			success: function (lista) {

				console.log('PASO F2');
				console.log(lista);


			},
			error: function (xhr, ajaxOptions, thrownError) {

				alert('xhr: ' + xhr);
				alert('ajaxOptions: ' + ajaxOptions);
				alert('thrownErrors: ' + thrownError);
			}
		});

	}



}


function most_alerta_riesgo_1(inv_cu) {
	var des_alerta_1 = '';

	$.ajax({
		type: "POST",
		//async: false,
		url: "/invierteWS/Ssi/traeAlertaRiesgoSSIDWH",
		dataType: "json",
		data: { id: inv_cu, tip: 1 },
		success: function (lisAlerta_1) {

			if (lisAlerta_1.length > 0) {
				$.each(lisAlerta_1, function (idxA, itemA) {

					des_alerta_1 = itemA.DES_ALERTA_RIE;

					if (des_alerta_1) {
						if (des_alerta_1.indexOf("[1]") >= 0) {
							$('#modAlertassi').modal('show');
							$('#alerta01').show();

							$('#btn_alertas').show();
						}  
					}
				});
			}
		},

	});

}

function most_alerta_riesgo_3(inv_cu) {
	var des_alerta_3 = '';

	$.ajax({
		type: "POST",
		//async: false,
		url: "/invierteWS/Ssi/traeAlertaRiesgoSSIDWH",
		dataType: "json",
		data: { id: inv_cu, tip: 3 },
		success: function (lisAlerta_3) {

			if (lisAlerta_3.length > 0) {
				$.each(lisAlerta_3, function (idxA, itemA) {

					des_alerta_3 = itemA.DES_ALERTA_RIE;

					if (des_alerta_3) {
						if (des_alerta_3.indexOf("[1]") >= 0) {
							$('#modAlertassi').modal('show');
							$('#alerta03').show();
							$('#btn_alertas').show(); 
						}  
					}
				});

			} 

		},

	});

}

function most_alerta_riesgo_4(inv_cu) {
	var des_alerta_4 = '';

	$.ajax({
		type: "POST",
		//async: false,
		url: "/invierteWS/Ssi/traeAlertaRiesgoSSIDWH",
		dataType: "json",
		data: { id: inv_cu, tip: 4 },
		success: function (lisAlerta_4) {

			if (lisAlerta_4.length > 0) {
				$.each(lisAlerta_4, function (idxA, itemA) {

					des_alerta_4 = itemA.DES_ALERTA_RIE;

					if (des_alerta_4) {
						if (des_alerta_4.indexOf("[1]") >=0) {
							$('#modAlertassi').modal('show');
							$('#alerta04').show();
							$('#btn_alertas').show();
						}  
					}
				});

			} 

		},

	});

}

var lis_sect_bus = [], lis_gore_bus = [], lis_dpto_bus = [];

function carga_filtros_busc() {

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeLisUbigeo",
		dataType: "json",
		data: { tipo: "DPTO", dpto: 0, prov: 0 },
		success: function (lista_filt) {
			lis_dpto_bus = lista_filt;
			lis_gore_bus = lista_filt;

			$.each(lis_dpto_bus, function (index, item) {
				$("#cbo_dpto").append("<option value=" + item.ID_DPTO + ">" + item.NOMBRE + "</option>"); 
				$("#cbo_gore").append("<option value=" + item.DEPARTAMENTO + "> GOBIERNO REGIONAL " + item.NOMBRE + "</option>");
			});

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	});


	$.ajax({
		type: "GET",
		async: false,
		url: "/invierte/general/traeListaSector",
		dataType: "json",
		success: function (lista_filt2) {
			if (lista_filt2.length > 0) {
				lis_sect_bus = lista_filt2.filter(x => x.SECTOR_ODI != 96 && x.SECTOR_ODI != 97 && x.SECTOR_ODI != 46 && x.SECTOR_ODI != 47);

				$.each(lis_sect_bus, function (index, item) {
					$("#cbo_sect").append("<option value=" + item.SECTOR_ODI + ">" + item.DESCRIP_SECTOR + "</option>"); 
				});

			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	}); 
}

var gopc_nivgob, gopc_sect = '', gopc_gore = 0, gopc_dpto = 0, gopc_prov = 0, gopc_dist = 0;
var html_acum = '', num_fil_grid = 0;

function Busqueda_Agregada_GN()
{

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/busqAgregadaSSI",
		dataType: "json",
		data: { sect: gopc_sect, plie: 0, dpto: 0, prov: 0, dist: 0, tipo: "GN"  },
		success: function (lista) {
			html_acum = ''; 
			num_fil_grid = 0;

			$.each(lista, function (index, item) { 
				html_acum += '<tr class="fil_hisfinan"><td>' + item.DES_TIPO_INVERSION + '</td>';
				html_acum += '<td>' + formMilesDec(item.COSTO_ACTUALIZADO) + '</td>'; 
				html_acum += '<td>' + item.NUM_INVERS + '</td></tr>'; 

				num_fil_grid += item.NUM_INVERS;
			}); 

			$("#tb_inv_acum").html(html_acum); 

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	}); 
}

function Busqueda_Agregada_GR() {

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/busqAgregadaSSI",
		dataType: "json",
		data: { sect: '', plie: gopc_gore, dpto: 0, prov: 0, dist: 0, tipo: "GR" },
		success: function (lista) { 
			html_acum = ''; 
			num_fil_grid = 0;

			$.each(lista, function (index, item) {
				html_acum += '<tr class="fil_hisfinan"><td>' + item.DES_TIPO_INVERSION + '</td>';
				html_acum += '<td>' + formMilesDec(item.COSTO_ACTUALIZADO) + '</td>';
				html_acum += '<td>' + item.NUM_INVERS + '</td></tr>'; 

				num_fil_grid += item.NUM_INVERS;
			});

			$("#tb_inv_acum").html(html_acum);

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	});
}

function Busqueda_Agregada_GL() {

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/busqAgregadaSSI",
		dataType: "json",
		data: { sect: '', plie: 0, dpto: gopc_dpto, prov: gopc_prov, dist: gopc_dist, tipo: gopc_nivgob },
		success: function (lista) {

			html_acum = '';
			num_fil_grid = 0;

			$.each(lista, function (index, item) {
				html_acum += '<tr class="fil_hisfinan"><td>' + item.DES_TIPO_INVERSION + '</td>';
				html_acum += '<td>' + formMilesDec(item.COSTO_ACTUALIZADO) + '</td>';
				html_acum += '<td>' + item.NUM_INVERS + '</td></tr>';

				num_fil_grid += item.NUM_INVERS;
			});

			$("#tb_inv_acum").html(html_acum);

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	});
}