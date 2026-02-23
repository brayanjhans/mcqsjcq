$(document).ready(function () {

	$('#div_princ').hide();
	$("#d_invers").hide();

	$("#fil_gore").hide();
	$("#fil_munic").hide();

	$('#div_oci').hide();

	// $('#modEncuesta').modal('show');
	ind_tab01 = 0;
	ind_tab02 = 0;
	ind_tab03 = 0;
	ind_tab04 = 0;

	$("#img_datgral").attr("src", "../Content/img/datgral_inac_ini.png");
	$("#img_financ").attr("src", "../Content/img/financ_inac_ini.png");
	$("#img_contrat").attr("src", "../Content/img/contrat_inac_ini.png");
	$("#img_infobr").attr("src", "../Content/img/infobr_inac_ini.png");
	$("#img_desactiv").attr("src", "../Content/img/vacio.png");
	$("#img_desactiv").attr("title", "");
	$("#txt_desactiv").html('');
	$('#btn_alertas').hide();

	var mob_1 = isMobile_1();
	var mob_2 = isMobile_2();
	var mob_3 = isMobile_3();
	var mob_4 = isMobile_4();

	var f = new Date();
	f.setDate(f.getDate() - 1);

	var fec_ssi = f.format("dd/mm/yyyy");

	$("#fec_act_ssi").html('La información es actualizada diariamente. <b>Útima actualización: ' + fec_ssi + '</b>.');

	// comentado solo por demo
	carga_filtros_busc();


	$('[data-toggle="tooltip"]').tooltip();


});

//*******Init**************//

var cod_unico, cod_snip, tip_busc, par_bus;
var cnt_param_web = 0, vermovil = 0;
var ind_apple = 'N';

function detectDevice() {

	var mob_1 = isMobile_1();
	var mob_2 = isMobile_2();
	var mob_3 = isMobile_3();
	var mob_4 = isMobile_4();
	var mob_os = getOS();

	var propmob = navigator.userAgent;
	var pos_enc = propmob.indexOf('iPhone');
	/*
	var userAgent = window.navigator.userAgent;
	} else if (/Android/.test(userAgent)) {
		os = 'Android';
	} else if (/iPhone|iPad|iPod/.test(userAgent)) {
		os = 'iOS';
	*/

	if (pos_enc >= 1 || mob_os == 'MacOS') {
		ind_apple = 'S';
	}

	bus_param_env();

	if (pos_enc >= 1 && mob_os != 'Windows' && mob_os != 'MacOS' && mob_os != 'Linux') {
		if (cnt_param_web == 2) {
			window.location.replace("https://ofi5.mef.gob.pe/ssi/Ssi/Indexm?codigo=" + cod_unico + "&tipo=" + par_bus);

		} else {
			window.location.replace("https://ofi5.mef.gob.pe/ssi/Ssi/Indexm");
		}
	}

	if ((isMobile || mob_1 || mob_2 || mob_3 || mob_4) && mob_os != 'Windows' && mob_os != 'MacOS' && mob_os != 'Linux') {
		if (cnt_param_web == 2) {
			window.location.replace("https://ofi5.mef.gob.pe/ssi/Ssi/Indexm?codigo=" + cod_unico + "&tipo=" + par_bus);

		} else {
			window.location.replace("https://ofi5.mef.gob.pe/ssi/Ssi/Indexm");
		}
	}

	if (cnt_param_web == 2) {
		gen_inform_inv_ssi(cod_unico, tip_busc);
	}

}

function bus_param_env() {
	var sPaginaURL = window.location.search.substring(1);
	var sURLVariables = sPaginaURL.split('&');
	var sParametro;

	for (var i = 0; i < sURLVariables.length; i++) {
		sParametro = sURLVariables[i].split('=');

		if (sParametro[0] == 'codigo') {
			cod_unico = sParametro[1];
			cnt_param_web++;

			$('#txt_cu').val(cod_unico);
		}

		if (sParametro[0] == 'tipo') {
			if (sParametro[1] == 2) {
				tip_busc = 'SIAF';
			} else {
				tip_busc = 'SNIP';
			}

			par_bus = sParametro[1];
			cnt_param_web++;
		}
	}
}

function obt_param_rep() {
	cod_unico = $.trim($('#txt_cu').val());

	var val = $.trim($('#txt_cu').val()).length;

	if (val < 7) {
		tip_busc = 'SNIP';
	} else {
		tip_busc = 'SIAF';
	}
}

function ConsProyInv() {
	obt_param_rep();

	gen_inform_inv_ssi(cod_unico, tip_busc);
}

var cu_enc = 0, ind_desact = 0, dias_desact = 0, des_tip_inv = '', des_cie_pend = '';
var ind_img_64 = 0, ind_cie_pend = 0, ind_cie_rest = 0, dias_ciebre = 0;
var des_perd_vig = '', des_alertas = '', cnt_aler = 0;

function gen_inform_inv_ssi(par_cod_inv, par_tipo) {
	var fec_act, fecrep = new Date(), fec_ejec, fec_per;
	var img_url, costo_inv_tot = 0, des_alerta_57 = '';

	if (ind_apple != 'S') {
		$("#divPreload").show();
	}

	cu_enc = 0; ind_desact = 0; dias_desact = 0; des_tip_inv = '', des_cie_pend = '';
	ind_img_64 = 0; ind_cie_pend = 0; ind_cie_rest = 0; dias_ciebre = 0;
	des_perd_vig = ''; des_alertas = ''; cnt_aler = 0;

	most_inicio();
	$('#div_fye').show();

	$.ajax({
		type: "POST",
		url: "/invierteWS/Ssi/traeDetInvSSI",
		dataType: "json",
		cache: false,
		data: { id: par_cod_inv, tipo: par_tipo },
		success: function (lista) {

			if (lista.length > 0) {
				if (lista[0].DES_VERIF == "0") {
					most_dev_hist(lista[0].CODIGO_UNICO);
					most_perd_vig(lista[0].CODIGO_UNICO, lista[0].COD_TIPO_INVERSION);

					if (lista[0].IND_REG_FONIPREL == "SI") {
						most_foniprel(lista[0].CODIGO_UNICO);
					}

					most_paralizada(lista[0].CODIGO_UNICO);
					most_cie_bre(lista[0].CODIGO_UNICO);
					most_uep_fte(lista[0].CODIGO_UNICO);
					most_especifica(lista[0].CODIGO_UNICO);
					
					if (lista[0].DES_CONVOCATORIA == "SI") {
						most_seace(lista[0].CODIGO_UNICO, lista[0].COD_SNIP);
					}

					most_oxi(lista[0].CODIGO_UNICO)
					most_infobras(lista[0].COD_SNIP);
					verif_geoinvierte(lista[0].CODIGO_UNICO);

					des_tip_inv = lista[0].TIPO_FORMATO;

					if (lista[0].COD_TIPO_INVERSION == "8") {
						$('#div_fye').hide();
						$('#div_fye_res').hide();
					}


					$.each(lista, function (idx, item) {
						
						$("#td_cu").html(item.CODIGO_UNICO);
						$("#td_tipinv").html(item.TIPO_FORMATO);
						$("#td_nominv").html(item.NOMBRE_INVERSION);
						$("#td_cab05").html(item.MODAL_EJEC);
						$("#td_uei").html(item.DES_UNIDAD_UEI);
						$("#td_opmi").html(item.NOMBRE_OPMI);

						if (item.COD_TIPO_INVERSION == "8") {
							$("#td_snip").html('');
						} else {
							$("#td_snip").html(item.COD_SNIP);
						}

						$("#td_estcu").html(item.ESTADO);
						$("#td_uf").html(item.DES_UNIDAD_UF);
						$("#td_mtoviab").html(formMilesDec(item.MTO_VIABLE));
						$("#td_ccc_fye").html(formMilesDec(item.MTO_CCONCURR_FYE));
						$("#td_totviab").html(formMilesDec(item.MTO_TOT_VIAB));
						$("#td_benif").html(formMiles(item.BENEFICIARIO));
						$("#td_concurr").html(formMilesDec(item.MTO_CCONCURR_EJE));
						$("#td_laudo").html(formMilesDec(item.MTO_LAUDO));
						$("#td_carfza").html(formMilesDec(item.MTO_CartFza));

						$("#val_cta").html(formMilesDec(item.COSTO_ACTUALIZADO));
						$("#td_mtototal").html(formMilesDec(item.MTO_F8_C + item.MTO_LAUDO + item.MTO_CartFza));
						$("#td_mtototal2").html(formMilesDec(item.MTO_F8_C + item.MTO_LAUDO + item.MTO_CartFza));

						$("#td_cadfun").html(item.FUNCION + ' - ' + item.DES_PROGRAMA + ' - ' + item.DES_SUB_PROGRAMA);

						fec_ejec = convFecNum(item.FEC_REGISTRO);
						$("#td_fecreg").html(fec_ejec);

						fec_ejec = convFecNum(item.FEC_VIABLE);
						$("#td_fecviab").html(fec_ejec);

						if (item.SITUACION) {

							if (item.MARCO == 'SNIP') {
								if (item.ID_PROYECTO > 0) {
									img_url = "/invierte/formato/verProyecto/" + item.ID_PROYECTO;
								} else {
									img_url = "/invierte/formato/verFichaSNIP/" + item.COD_SNIP + "/" + item.COD_TIPO_INVERSION + "/" + item.DES_VERIF;
								}

							} else {
								img_url = "/invierte/formato/verProyecto/" + item.ID_PROYECTO;
							}

							$("#td_situinv").html(item.SITUACION + ' &nbsp&nbsp ' + '<a href="' + img_url + '" target= "_blank" ><img src = "../Content/img/book.png" /></a>');
						}

						if (item.DES_EXCEPCION) {
							$("#td_emergds").html('SI, ' + item.DES_EXCEPCION);
						} else {
							$("#td_emergds").html('NO');
						}

						if (item.IND_REG_PMI == 'NO') {
							$("#td_indpmi").html(item.IND_REG_PMI);
						} else {
							img_url = "/invierte/pmi/consultapmi?cui=" + item.CODIGO_UNICO;

							$("#td_indpmi").html(item.IND_REG_PMI + ' &nbsp&nbsp ' + '<a href="' + img_url + '" target= "_blank" ><img src = "../Content/img/pmi.png" /></a>');
						}

						if (item.ET_REGISTRADO == 'NO') {

							if (item.TIENE_F8 == 'NO') {
								$("#td_indet").html(item.ET_REGISTRADO);
							} else {
								img_url = "/invierte/ejecucion/traeListaEjecucionSimplePublica/" + item.CODIGO_UNICO;

								$("#td_indet").html(item.ET_REGISTRADO + ' &nbsp&nbsp ' + '<a href="' + img_url + '" target= "_blank" ><img src = "../Content/img/pmi.png" /></a>');
							}

						} else {
							img_url = "/invierte/ejecucion/traeListaEjecucionSimplePublica/" + item.CODIGO_UNICO;

							$("#td_indet").html(item.ET_REGISTRADO + ' &nbsp&nbsp ' + '<a href="' + img_url + '" target= "_blank" ><img src = "../Content/img/pmi.png" /></a>');
						}

						if (item.TIENE_F12B == 'NO') {
							$("#td_indseg").html(item.TIENE_F12B);
						} else {
							img_url = "https://ofi5.mef.gob.pe/invierteWS/Repseguim/ResumF12B?codigo=" + item.CODIGO_UNICO;

							$("#td_indseg").html(item.TIENE_F12B + ' &nbsp&nbsp ' + '<a href="' + img_url + '" target= "_blank" ><img src = "../Content/img/seguim.png" /></a>');
						}

						if (item.CIERRE_REGISTRADO == 'NO') {
							$("#td_f9").html(item.CIERRE_REGISTRADO);
						} else {

							if (item.TIPO_FORMATO == "FUR" || item.MARCO == "SNIP" || item.CIERRE_REGISTRADO == "NO CULMINADA") {
								img_url = "/invierte/informeCierre/consultaCierre/" + item.CODIGO_UNICO;
							} else {
								img_url = "/appcierre/Default.aspx?proyecto=" + item.CODIGO_UNICO;
							}

							$("#td_f9").html(item.CIERRE_REGISTRADO.toUpperCase() + ' &nbsp&nbsp ' + '<a href="' + img_url + '" target= "_blank" ><img src = "../Content/img/book.png" /></a>');
						}

						des_alerta_57 = item.IND_ALERTAS;
						costo_inv_tot = (item.MTO_F8_C + item.MTO_LAUDO + item.MTO_CartFza);

						$("#por_avanacum").html(Math.round((dev_acum_inv / costo_inv_tot) * 100 + "e+1") / 10 + ' %');

						if (costo_inv_tot == 0) { $("#por_avanacum").html('0 %'); }

						var saldo_pend = Math.round((costo_inv_tot - dev_acum_inv) + "e+2") / 100;

						$("#sdo_ejecacum").html(formMilesDec(saldo_pend));

						$("#por_avananio").html(Math.round((dev_anio_inv / pim_anio_inv) * 100 + "e+1") / 10 + ' %');

						if (pim_anio_inv == 0) { $("#por_avananio").html('0 %'); }

						$("#sdo_ejecanio").html(formMilesDec(pim_anio_inv - dev_anio_inv));

						if (item.FEC_INI_EJ) {
							fec_act = item.FEC_INI_EJ.substr(0, 10);

							fec_act = fec_act.substr(0, 2) + '/' + fec_act.substr(3, 2) + '/' + fec_act.substr(6, 4);

							$("#fec_iniejec").html('<span title="Ejecución">' + fec_act + '</span>');
						}

						if (item.FEC_FIN_EJ) {
							fec_act = item.FEC_FIN_EJ.substr(0, 10);
							fec_act = fec_act.substr(0, 2) + '/' + fec_act.substr(3, 2) + '/' + fec_act.substr(6, 4);

							$("#fec_finejec").html(fec_act);
						}

						if (prim_dev_inv) {
							fec_per = prim_dev_inv;
							fec_per = new Date(fec_per.substr(0, 4), fec_per.substr(4, 2) - 1, '01');
							$("#pridev").html(fec_per.format("mmm-yyyy").toUpperCase());

							fec_per = ult_dev_inv;
							fec_per = new Date(fec_per.substr(0, 4), fec_per.substr(4, 2) - 1, '01');
							$("#ultdev").html(fec_per.format("mmm-yyyy").toUpperCase());
						}

						$("#des_pim").html('PIM ' + fecrep.getFullYear() + ' (c)');
						$("#des_avan").html('DEVENGADO ' + fecrep.getFullYear() + ' (d)');
						$("#des_avanacum").html('DEVENGADO ACUMULADO AL ' + fecrep.getFullYear() + ' (b) ');

						$("#des_avanfinan").html('AVANCE FINANCIERO ' + fecrep.getFullYear() + ' (d/c) ');
						$("#des_sdoanio").html('SALDO POR DEVENGAR ' + fecrep.getFullYear() + ' (c-d)');

						cu_enc = 1;

						$('#div_princ').show();

					});


					most_datos01();

					carga_resumen();

					var ind_alerta_2 = 0, ind_alerta_5 = 0, ind_alerta_6 = 0, ind_alerta_7 = 0;
					var	cnt_verif_alerta = 0;

					if (lista[0].ESTADO == "ACTIVO" && lista[0].COD_TIPO_INVERSION != '3' && lista[0].COD_TIPO_INVERSION != '5') {

						if (dev_acum_inv > 0 && lista[0].AVAN_FISICO < 90 && lista[0].DES_CONVOCATORIA == 'SI') {
							most_alerta_riesgo_1(lista[0].CODIGO_UNICO);

						} 

						if (dev_acum_inv > 0 && lista[0].AVAN_FISICO >= 0) {
							if ((dev_acum_inv / costo_inv_tot) * 100 - lista[0].AVAN_FISICO > 20) {
								ind_alerta_2 = 1;
							}
						}

						if (ind_alerta_2 == 1) {
							// $('#modAlertassi').modal('show');
							$('#alerta02').show();
							cnt_aler += 1;
							$('#btn_alertas').show();
						}  


						if (costo_inv_tot > 0 && dev_anio_inv < 0.9 * pim_anio_inv && listMesDev.length > 1) {
							most_alerta_riesgo_3(lista[0].CODIGO_UNICO);

						} 

						if (pim_anio_inv > 0 && lista[0].AVAN_FISICO > 0 && listMesDev.length > 1) {
							most_alerta_riesgo_4(lista[0].CODIGO_UNICO);

						}

						if (lista[0].AVAN_FISICO > 0 && costo_inv_tot > 0 && des_alerta_57) {
							if (pim_anio_inv > 0 || lista[0].IND_REG_PMI == 'SI') {
								if (des_alerta_57.indexOf("[5]") >= 0) {
									ind_alerta_5 = 1;
								}
							} 
						} 

						if (ind_alerta_5 == 1) {
							// $('#modAlertassi').modal('show');
							$('#alerta05').show();
							cnt_aler += 1;
							$('#btn_alertas').show();
						}  


						if (dev_acum_inv > 10 && costo_inv_tot > 10) {
							if (dev_acum_inv > (costo_inv_tot + 1)) {
								ind_alerta_6 = 1;
							}

						} 

						if (ind_alerta_6 == 1) {
							// $('#modAlertassi').modal('show');
							$('#alerta06').show();
							cnt_aler += 1;
							$('#btn_alertas').show();
						}  


						if (costo_inv_tot > 0 && des_alerta_57) { 
							if (des_alerta_57.indexOf("[7]") >= 0) {
								ind_alerta_7 = 1;
							}

						} 

						if (ind_alerta_7 == 1) {
							// $('#modAlertassi').modal('show');
							$('#alerta07').show();
							cnt_aler += 1;
							$('#btn_alertas').show();
						}  

						if (cnt_aler >= 1) {
							$('#modAlertassi').modal('show');
						}


					}


					


				}

				//$("#divPreload").hide();

				if (ind_apple != 'S') {
					$("#divPreload").hide();
				}

			} else {
				//$("#divPreload").hide();
				if (ind_apple != 'S') {
					$("#divPreload").hide();
				}
				alert('El CUI ' + par_cod_inv + ' No se encuentra registrado en el Banco de Inversiones y no posee información financiera en el SIAF');
			}

		},

		error: function (xhr, ajaxOptions, thrownError) {
			//$("#divPreload").hide();
			if (ind_apple != 'S') {
				$("#divPreload").hide();
			}

			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	});

}

var w_modFteFinan = document.getElementById('modFteFinan')
w_modFteFinan.addEventListener('show.bs.modal', function (event) {
	// Button that triggered the modal
	var butfte = event.relatedTarget
	// Extract info from data-bs-* attributes
	var desc_uep = butfte.getAttribute('data-bs-whatever')

	html_tab = '';
	listAnio = [];
	listAnio = listFteFi.filter(function (list) { return list.SEC_EJEC == desc_uep; });

	$.each(listAnio, function (idxf, itemf) {

		html_tab += '<tr class="fil_hisfinan">';
		html_tab += '<td>' + itemf.DES_FUENTE_FINANC + '</td>';
		html_tab += '<td>' + itemf.NUM_ANIO + '</td>';
		html_tab += '<td>' + formMilesDec(itemf.MTO_PIM) + '</td>';
		html_tab += '<td>' + formMilesDec(itemf.MTO_DEVEN) + '</td></tr>';

	});

	$("#tb_ftefin").html(html_tab);

})

var lis_aniof = [];

var w_modDevUEP = document.getElementById('modDevUEP')
w_modDevUEP.addEventListener('show.bs.modal', function (event) {
	var butfte = event.relatedTarget // Button that triggered the modal
	var desc_uep = butfte.getAttribute('data-bs-whatever') // Extract info from data-* attributes

	html_tab = '';
	mto_dev_acum = 0;

	lis_aniof = [];
	lis_aniof = lis_uepanio.filter(function (list) { return list.SEC_EJEC == desc_uep; });

	$.each(lis_aniof, function (idx_a, item_a) {

		listAnio = [];
		listAnio = listMesUEP.filter(function (list) { return list.NUM_ANIO == item_a.NUM_ANIO && list.SEC_EJEC == desc_uep; });

		dev_mes1 = ''; dev_mes2 = ''; dev_mes3 = ''; dev_mes4 = ''; dev_mes5 = ''; dev_mes6 = ''; dev_mes7 = '';
		dev_mes8 = ''; dev_mes9 = ''; dev_mes10 = ''; dev_mes11 = ''; dev_mes12 = '';
		mto_pia = 0; mto_pim = 0; mto_cert = 0; mto_comprom = 0; mto_deveng = 0;

		$.each(listAnio, function (idxf, itemf) {
			mto_pia += itemf.MTO_PIA;
			mto_pim += itemf.MTO_PIM;
			mto_deveng += itemf.MTO_DEVEN;
			mto_comprom += itemf.MTO_COMPROM;
			mto_cert += itemf.MTO_CERT;

			switch (itemf.COD_MES) {
				case 1: dev_mes1 = itemf.MTO_DEVEN; break;
				case 2: dev_mes2 = itemf.MTO_DEVEN; break;
				case 3: dev_mes3 = itemf.MTO_DEVEN; break;
				case 4: dev_mes4 = itemf.MTO_DEVEN; break;
				case 5: dev_mes5 = itemf.MTO_DEVEN; break;
				case 6: dev_mes6 = itemf.MTO_DEVEN; break;
				case 7: dev_mes7 = itemf.MTO_DEVEN; break;
				case 8: dev_mes8 = itemf.MTO_DEVEN; break;
				case 9: dev_mes9 = itemf.MTO_DEVEN; break;
				case 10: dev_mes10 = itemf.MTO_DEVEN; break;
				case 11: dev_mes11 = itemf.MTO_DEVEN; break;
				case 12: dev_mes12 = itemf.MTO_DEVEN; break;
			}

		});

		mto_dev_acum += mto_deveng;

		html_tab += '<tr class="fil_hisfinan">';
		html_tab += '<td>' + item_a.NUM_ANIO + '</td>';
		html_tab += '<td>' + formMilesDec(mto_pia) + '</td>';
		html_tab += '<td>' + formMilesDec(mto_pim) + '</td>';
		html_tab += '<td>' + formMilesDec(mto_cert) + '</td>';
		html_tab += '<td>' + formMilesDec(mto_comprom) + '</td>';
		html_tab += '<td>' + formMilesDec(mto_deveng) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes1) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes2) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes3) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes4) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes5) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes6) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes7) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes8) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes9) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes10) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes11) + '</td>';
		html_tab += '<td>' + formMilesDec(dev_mes12) + '</td></tr>';


	});

	$("#tb_devuep").html(html_tab);



})

var w_modBuscNom = document.getElementById('modBuscNom')
w_modBuscNom.addEventListener('show.bs.modal', function (event) {

	$("#tb_invers").html('');

})

$('#tab_invers').on('click', 'tbody tr', function (event) {

	$('#tab_invers tbody tr').removeClass('filsel_bus');
	$(this).addClass('filsel_bus');

	inv_selec = $(this).attr('id');

	ConsProyNombre();

});

var inv_selec;

function ConsProyNombre() {
	$('#txt_cu').val(inv_selec);

	obt_param_rep();

	$('#modBuscNom').modal('hide');

	gen_inform_inv_ssi(inv_selec, tip_busc);

}

function ConsBuscNom() {
	var html_inv = '', cu_inv, cnt_dwh = 0, lista_dwh = [];
	var nom_inv = $.trim($('#txtNomInv').val());

	if (ind_apple != 'S') {
		$("#divPreload").show();
	}

	$.ajax({
		type: "POST",
		async: false,
		url: "/invierteWS/Ssi/busInvNombreDWH",
		//url: "https://test-ofi.mef.gob.pe/invierteWS/Ssi/busInvNombreDWH",
		dataType: "json",
		data: { des_inv: nom_inv, tipo: "NOM" },
		success: function (lista_1) {

			cnt_dwh = lista_1.length;
			lista_dwh = lista_1;

		},

	});

	if (cnt_dwh < 1) {
		$.ajax({
			type: "POST",
			async: false,
			url: "/invierteWS/Dashboard/busInvNombreSSI",
			//url: "https://test-ofi.mef.gob.pe/invierteWS/Ssi/busInvNombreSSI",
			dataType: "json",
			data: { des_inv: nom_inv, tipo: "NOM" },
			success: function (lista_inv) {

				cnt_dwh = lista_inv.length;
				lista_dwh = lista_inv;
			},

		});
	}



	if (cnt_dwh > 0) {
		$.each(lista_dwh, function (idx, item) {
			cu_inv = item.CODIGO_UNICO;

			if (cu_inv < 1000) {
				cu_inv = item.COD_SNIP;
			}

			html_inv += '<tr id = "' + cu_inv + '" style="border-top: 2px solid #F7F7F7;">';
			html_inv += '<td>' + item.CODIGO_UNICO + '</td>';
			html_inv += '<td>' + item.COD_SNIP + '</td>';
			html_inv += '<td>' + item.NOMBRE_INVERSION + '</td>';
			html_inv += '<td>' + item.ESTADO + '</td>';
			html_inv += '<td>' + item.SITUACION + '</td> </tr>';

		});

		$("#d_invers2").hide();
		$("#d_invers").show();

		$("#tb_invers").html(html_inv);

		GenGrid($('#tab_invers'));

	}


	if (ind_apple != 'S') {
		$("#divPreload").hide();
	}

}

var ind_tab01 = 0;

$("#btn_gral").click(function () {
	ind_tab01++;

	if (cu_enc > 0) {
		if (ind_tab01 == 1) {
			$("#img_financ").attr("src", "../Content/img/financ_inac_ini.png");
			$("#img_contrat").attr("src", "../Content/img/contrat_inac_ini.png");
			$("#img_infobr").attr("src", "../Content/img/infobr_inac_ini.png");

			$("#img_datgral").attr("src", "../Content/img/datgral_link_ini.png");

			ind_tab02 = 0;
			ind_tab03 = 0;
			ind_tab04 = 0;
		}
	}

});

var ind_tab02 = 0;

$("#btn_finan").click(function () {
	ind_tab02++;

	if (cu_enc > 0) {
		if (ind_tab02 == 1) {
			$("#img_datgral").attr("src", "../Content/img/datgral_inac_ini.png");
			$("#img_contrat").attr("src", "../Content/img/contrat_inac_ini.png");
			$("#img_infobr").attr("src", "../Content/img/infobr_inac_ini.png");

			$("#img_financ").attr("src", "../Content/img/financ_link_ini.png");

			ind_tab01 = 0;
			ind_tab03 = 0;
			ind_tab04 = 0;
		}
	}

});

var ind_tab03 = 0;

$("#btn_seace").click(function () {
	ind_tab03++;

	if (cu_enc > 0) {
		if (ind_tab03 == 1) {
			$("#img_datgral").attr("src", "../Content/img/datgral_inac_ini.png");
			$("#img_financ").attr("src", "../Content/img/financ_inac_ini.png");
			$("#img_infobr").attr("src", "../Content/img/infobr_inac_ini.png");

			$("#img_contrat").attr("src", "../Content/img/contrat_link_ini.png");

			ind_tab01 = 0;
			ind_tab02 = 0;
			ind_tab04 = 0;
		}
	}

});

var ind_tab04 = 0;

$("#btn_infob").click(function () {
	ind_tab04++;

	if (cu_enc > 0) {
		if (ind_tab04 == 1) {
			$("#img_datgral").attr("src", "../Content/img/datgral_inac_ini.png");
			$("#img_contrat").attr("src", "../Content/img/contrat_inac_ini.png");
			$("#img_financ").attr("src", "../Content/img/financ_inac_ini.png");

			$("#img_infobr").attr("src", "../Content/img/infobr_link_ini.png");

			ind_tab01 = 0;
			ind_tab02 = 0;
			ind_tab03 = 0;
		}
	}

});

function most_inicio() {
	$('#div_princ').hide();
	$('#div_oci').hide();
	$('#dv_oxi_1').hide();
	$('#dv_oxi_2').hide();

	$("#img_datgral").attr("src", "../Content/img/datgral_inac_ini.png");
	$("#img_financ").attr("src", "../Content/img/financ_inac_ini.png");
	$("#img_contrat").attr("src", "../Content/img/contrat_inac_ini.png");
	$("#img_infobr").attr("src", "../Content/img/infobr_inac_ini.png");
	$("#img_desactiv").attr("src", "../Content/img/vacio.png");
	$("#img_desactiv").attr("title", "");
	$("#txt_desactiv").html('');
	$('#btn_alertas').hide();
	$('#alerta01').hide();
	$('#alerta02').hide();
	$('#alerta03').hide();
	$('#alerta04').hide();
	$('#alerta05').hide();
	$('#alerta06').hide();
	$('#alerta07').hide();

	$('#m_datos01').removeClass('active');
	$('#m_datos02').removeClass('active');
	$('#m_datos03').removeClass('active');
	$('#m_datos04').removeClass('active');

	$('#m_datos01').addClass('fade');
	$('#m_datos02').addClass('fade');
	$('#m_datos03').addClass('fade');
	$('#m_datos04').addClass('fade');

	$("#tb_foniprel").html('');
	$("#tb_hist_anual").html('');
	$("#canvas02").html('');
	$("#legend02").html('');
	$("#tb_hist_especif").html('');
	$("#tb_uep").html('');
	$("#tb_seaceobra").html('');
	$("#tb_seaceserv").html('');
	$("#tb_seacebien").html('');
	$("#tb_seaceconsul").html('');

	$("#tb_devmes").html('');
	$("#tb_ftefin").html('');
	$("#tb_devuep").html('');
	$("#div_infobras").html('');

	$("#td_cu").html('');
	$("#td_snip").html('');
	$("#td_fecreg").html('');
	$("#td_nominv").html('');
	$("#td_estcu").html('');
	$("#td_tipinv").html('');
	$("#td_indpmi").html('');
	$("#td_opmi").html('');
	$("#td_uf").html('');
	$("#td_uei").html('');
	$("#td_situinv").html('');
	$("#td_fecviab").html('');
	$("#td_emergds").html('');
	$("#td_mtoviab").html('');
	$("#td_cadfun").html('');
	$("#td_benif").html('');
	$("#td_indet").html('');
	$("#val_cta").html('');
	$("#td_indseg").html('');
	$("#td_laudo").html('');
	$("#td_f9").html('');
	$("#td_carfza").html('');
	$("#fec_iniejec").html('');
	$("#fec_finejec").html('');
	$("#td_mtototal").html('');
	$("#td_mtototal2").html('');

	$("#td_indcie").html('');
	$("#td_estind").html('');
	$("#td_umind").html('');
	$("#td_valcie").html('');

	$("#val_pim").html('');
	$("#val_efin").html('');
	$("#val_avan").html('');
	$("#por_avanacum").html('');
	$("#por_avananio").html('');
	$("#sdo_ejecacum").html('');
	$("#sdo_ejecanio").html('');
	$("#pridev").html('');
	$("#ultdev").html('');
	$("#td_mapa").html('');

	$("#td_codpar").html('');
	$("#td_desobra").html('');
	$("#td_modalpar").html('');
	$("#td_avanfispar").html('');
	$("#td_motivopar").html('');
	$("#td_fecparal").html('');
	$("#td_codpar_r").html('');
	$("#td_desobra_r").html('');
	$("#td_modalpar_r").html('');
	$("#td_avanfispar_r").html('');
	$("#td_motivopar_r").html('');
	$("#td_fecparal_r").html('');
	// resumen
	$("#tb_foniprel_res").html('');
	$("#tb_hist_anual_res").html('');
	$("#tb_hist_especif_res").html('');
	$("#tb_uep_res").html('');
	$("#tb_seaceobra_res").html('');
	$("#tb_seaceserv_res").html('');
	$("#tb_seacebien_res").html('');
	$("#tb_seaceconsul_res").html('');
	$("#canvas02_res").html('');
	$("#legend02_res").html('');
	$("#div_infobras_res").html('');


	lis_infobra = [];
	lis_avanobra = [];
}

const isMobile = navigator.userAgentData.mobile;

function isMobile_1() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isMobile_2() {
	try {
		document.createEvent("TouchEvent");
		return true;
	}
	catch (e) {
		return false;
	}
}

function isMobile_3() {
	if (window.matchMedia("(any-hover: none)").matches) {
		return true;
	}

	return false;
}

function isMobile_4() {

	if (window.matchMedia("(max-width: 64em)").matches) {
		return true;
	} else {
		return false;
	}

	// return ! (window.navigator.userAgent.includes('Mac') || window.navigator.userAgent.includes('Win')); 

}

function getOS() {
	var userAgent = window.navigator.userAgent;
	var platform = window.navigator.platform; // si funciona
	var os = null;

	if (platform.indexOf('Win') !== -1) {
		os = 'Windows';
	} else if (platform.indexOf('Mac') !== -1) {
		os = 'MacOS';
	} else if (platform.indexOf('Linux') !== -1) {
		os = 'Linux';
	} else if (/Android/.test(userAgent)) {
		os = 'Android';
	} else if (/iPhone|iPad|iPod/.test(userAgent)) {
		os = 'iOS';
	} else {
		os = 'Unknown';
	}

	return os;
}


$('input[type=radio][name="opt_niv"]').change(function () {
	//alert($(this).val()); // or, use `this.value`
	gopc_nivgob = $(this).val();
	gopc_sect = ''; gopc_gore = 0;
	gopc_dpto = 0; gopc_prov = 0; gopc_dist = 0;

	if (this.value == "GN") {
		$("#fil_sector").show();
		$("#fil_gore").hide();
		$("#fil_munic").hide();
	} else if (this.value == "GR") {
		$("#fil_gore").show();
		$("#fil_sector").hide();
		$("#fil_munic").hide();
	} else if (this.value == "GL") {
		$("#fil_munic").show();
		$("#fil_gore").hide();
		$("#fil_sector").hide();
	}

	$("#tb_inv_acum").html('');
});


$("#cbo_sect").change(function () {
	gopc_sect = $('#cbo_sect').val();
	gopc_nivgob = 'GN';
});

$("#cbo_gore").change(function () {
	gopc_gore = $('#cbo_gore').val();
	gopc_nivgob = 'GR';
});

$("#cbo_dpto").change(function () {
	var sel_dpto = $('#cbo_dpto').val();
	gopc_dpto = $('#cbo_dpto').val();
	gopc_nivgob = 'DPTO';

	$('#cbo_prov').empty();
	$('#cbo_prov').append('<option value="" disabled selected>Seleccione provincia</option>');

	$('#cbo_dist').empty();
	$('#cbo_dist').append('<option value="" disabled selected>Seleccione distrito</option>');

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeLisUbigeo",
		dataType: "json",
		data: { tipo: "PROV", dpto: sel_dpto, prov: 0 },
		success: function (lista) {

			$.each(lista, function (index, item) {
				$("#cbo_prov").append("<option value=" + item.PROVINCIA + ">" + item.NOMBRE + "</option>");
			});

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	});
});

$("#cbo_prov").change(function () {
	var sel_dpto = $('#cbo_dpto').val();
	var sel_prov = $('#cbo_prov').val();
	gopc_prov = $('#cbo_prov').val();
	gopc_nivgob = 'PROV';

	$('#cbo_dist').empty();
	$('#cbo_dist').append('<option value="" disabled selected>Seleccione distrito</option>');

	$.ajax({
		type: "POST",
		url: "/invierteWS/Dashboard/traeLisUbigeo",
		dataType: "json",
		data: { tipo: "DIST", dpto: sel_dpto, prov: sel_prov },
		success: function (lista) {

			$.each(lista, function (index, item) {
				$("#cbo_dist").append("<option value=" + item.DISTRITO + ">" + item.NOMBRE + "</option>");
			});

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert('xhr: ' + xhr);
			alert('ajaxOptions: ' + ajaxOptions);
			alert('thrownErrors: ' + thrownError);
		}
	});


});


$("#cbo_dist").change(function () {
	gopc_dist = $('#cbo_dist').val();
	gopc_gore = 0;
	gopc_sect = '';
	gopc_nivgob = 'DIST';
});
