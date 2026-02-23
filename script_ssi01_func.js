

const gridlines_backg = {
	id: 'gridlines_backg',
	beforeDraw(chart, args, options) {
		const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
		
		ctx.save();
		ctx.fillStyle = options.colorbg;
		ctx.fillRect(left, top, right - left, bottom - top);
		
		ctx.restore();
	}
};

const generateLegend = {
	id: 'generateLegend',
	beforeInit(chart, args, options) {
		var text = [], bcolor = '';

		bcolor = '#DB7C26';
		text.push('<ul class="ul_leyenda">');
		text.push('<li class="li_leyenda"><span class="ley_item" style=" background-color:' + bcolor + '">');
		text.push('</span><span>&nbsp PIM &nbsp&nbsp&nbsp&nbsp </span></li>');

		bcolor = '#BA3030';
		text.push('<li class="li_leyenda"><span class="ley_item" style=" background-color:' + bcolor + '">');
		text.push('</span><span>&nbsp DEVENGADO</span></li>');

		text.push('</ul>');

		//document.getElementById("legend02_res").innerHTML = text.join("");

		return;
	}
};

var graf_bar2 = null;
var graf_bar2_res = null;

function GrafBarDeven() {
	if (graf_bar2 != null) { graf_bar2.destroy(); }
	if (graf_bar2_res != null) { graf_bar2_res.destroy(); }
	
	var chartData = {
		labels: anioArray,
		datasets: [{
			type: 'bar',
			label: 'PIM',
			backgroundColor: '#DB7C26',
			horverBackgroundColor: '#DB7C26',
			data: pimtArray,
			borderColor: '#DB7C26',
			horverBorderColor: '#DB7C26',
			borderWidth: 0,
		},
		{
			type: 'bar',
			label: 'DEVENGADO',
			backgroundColor: '#BA3030',
			data: devenArray,
			borderColor: '#BA3030',
			borderWidth: 0,
		}
		]
	};

	var config02 = {
		type: 'bar',
		data: chartData,
		options: {
			responsive: true,

			plugins: {
				legend: {
					position: 'bottom',
				},
				title: {
					display: true,
					text: 'EJECUCIÓN FINANCIERA DE LA INVERSIÓN',
					color: '#000',
					font: {
						family: 'iCiel_Gotham_Medium', 
						size: '11px'
					},
				},
				gridlines_backg: {
					colorbg: '#EEF8FF',
				}	
			}, 
			scales: {
				x: {
					ticks: {
						/*
						// For a category axis, the val is the index so the lookup via getLabelForValue is needed
						callback: function (val, index) {
							// Hide the label of every 2nd dataset
							return index % 2 === 0 ? this.getLabelForValue(val) : '';
						},
						*/
						color: '#737373',
					},
					grid: {
						display: false,

					}, 
				},
				y: {
					display: false,
					 
				}
			},
		},

		plugins: [gridlines_backg]
	};

	var ctx02 = document.getElementById('canvas02').getContext("2d");
	graf_bar2 = new Chart(ctx02, config02 );

	var config02_res = {
		type: 'bar',
		data: chartData,
		options: {
			responsive: true,

			animation: {
				onComplete:
					graf_linea
			},
			 
			plugins: {
				legend: {
					position: 'bottom',
				},

				title: {
					display: true,
					text: 'EJECUCIÓN FINANCIERA DE LA INVERSIÓN',
					color: '#000',
					font: {
						family: 'iCiel_Gotham_Medium',
						size: '11px'
					},
				},
				gridlines_backg: {
					colorbg: '#EEF8FF',
				}
			},
			scales: {
				x: {
					ticks: {
						color: '#737373',
					},
					grid: {
						display: false,

					},
				},
				y: {
					display: false,

				}
			},
		},

	};

	var ctx02_res = document.getElementById('canvas02_res').getContext('2d');
	graf_bar2_res = new Chart(ctx02_res, config02_res);

}

function graf_linea() {
	var url_graf = graf_bar2_res.toBase64Image();

	if (url_graf.length > 10 ) {
		if (ind_img_64 == 0) {
			document.getElementById("url").src = url_graf;
			ind_img_64 = 1;

			$("#graf_temp").hide();
		}
	}
}

var pentag_1 = null;
var pentag_2 = null;

function GrafPentagono() {
	if (pentag_1 != null) { pentag_1.destroy(); }
	if (pentag_2 != null) { pentag_2.destroy(); }

	const chartData = {
		labels: ['1','2','3','4','5'],
		datasets: [{
			label: 'data',
			data: [10, 10, 10, 10, 10],
			// fill: true,
			backgroundColor: '#00b2e9',
			borderColor: '#00b2e9',
			pointBackgroundColor: '#00b2e9',
			pointBorderColor: '#00b2e9',
			pointHoverBackgroundColor: '#00b2e9',
			pointHoverBorderColor: '#00b2e9',
			borderWidth: 0,
		 
		}]
	};

	const conf_ptg01 = {
		type: 'radar',
		data: chartData,
		options: {
			elements: {
				line: {
					borderWidth: 1
				},
				point: {
					radius: 0,
					hoverRadius: 0,  
				}
			},
			scales: {
				r: {
					display: false,

					angleLines: {
						display: false
					},

					// suggestedMin: 9,
					// suggestedMax: 10
				},
				pointLabels: {
					display: false,
					
				},
			},
			maintainAspectRatio: false,
			responsive: false,
			layout: {
				padding: 0,
			},

			plugins: {
				title: {
					display: false,
					text: "ALERTA 1",
				},
				legend: {
					display: false,
				},
				tooltip: {
					enabled: false, 
				},
				 

			},
		},
		 

	}; 

	 var ctx_ptg01 = document.getElementById('canvaler01').getContext("2d");
	 pentag_1 = new Chart(ctx_ptg01, conf_ptg01);
	  

}



function most_datos01() {
	var des_viab;

	if (cu_enc > 0) {

		$("#img_datgral").attr("src", "../Content/img/datgral_link_ini.png");
		$("#img_financ").attr("src", "../Content/img/financ_inac_ini.png");
		$("#img_contrat").attr("src", "../Content/img/contrat_inac_ini.png");
		$("#img_infobr").attr("src", "../Content/img/infobr_inac_ini.png");
		 

		$('#m_datos02').removeClass('active');
		$('#m_datos03').removeClass('active');
		$('#m_datos04').removeClass('active');

		$('#m_datos02').addClass('fade');
		$('#m_datos03').addClass('fade');
		$('#m_datos04').addClass('fade');

		$('#m_datos01').removeClass('fade');
		$('#m_datos01').addClass('active');

	}

}

function GenGrid(table1) {

	var bodyCells, colWidth;

	for (i = 1; i <= 10; i++) {

		bodyCells = table1.find('tbody tr:first').children();
		// Get the tbody columns width array
		colWidth = bodyCells.map(function () {
			return $(this).width();
		}).get();

		// Set the width of thead columns
		table1.find('thead tr').children().each(function (i, v) {
			$(v).width(colWidth[i]);
		});

		bodyCells = table1.find('thead tr:first').children();

		colWidth = bodyCells.map(function () {
			return $(this).width();
		}).get();

		table1.find('tbody tr').children().each(function (i, v) {
			$(v).width(colWidth[i % colWidth.length]);
		});

	}
}

function Imprimir_resumen() {
	$("#divReporteImp").printThis();
}

function carga_resumen() {
	$("#td_cu_r").html($("#td_cu").html());
	$("#td_snip_r").html($("#td_snip").html());
	$("#td_fecreg_r").html($("#td_fecreg").html());
	$("#td_nominv_r").html($("#td_nominv").html());
	$("#td_estcu_r").html($("#td_estcu").html());
	$("#td_tipinv_r").html($("#td_tipinv").html());
	$("#td_indpmi_r").html($("#td_indpmi").html());
	$("#td_opmi_r").html($("#td_opmi").html());
	$("#td_uf_r").html($("#td_uf").html());
	$("#td_uei_r").html($("#td_uei").html());
	$("#td_situinv_r").html($("#td_situinv").html());
	$("#td_fecviab_r").html($("#td_fecviab").html());
	$("#td_emergds_r").html($("#td_emergds").html());
	$("#td_mtoviab_r").html($("#td_mtoviab").html());
	$("#td_ccc_fye_r").html($("#td_ccc_fye").html());
	$("#td_totviab_r").html($("#td_totviab").html());

	$("#td_cadfun_r").html($("#td_cadfun").html());
	$("#td_benif_r").html($("#td_benif").html());
	$("#td_indet_r").html($("#td_indet").html());
	$("#val_cta_r").html($("#val_cta").html());
	$("#td_indseg_r").html($("#td_indseg").html());
	$("#td_laudo_r").html($("#td_laudo").html());
	$("#td_f9_r").html($("#td_f9").html());
	$("#td_carfza_r").html($("#td_carfza").html());
	$("#td_concurr_r").html($("#td_concurr").html());
	$("#fec_iniejec_r").html($("#fec_iniejec").html());
	$("#fec_finejec_r").html($("#fec_finejec").html());
	$("#td_mtototal_r").html($("#td_mtototal").html());
	$("#td_mtototal2_r").html($("#td_mtototal2").html());

	$("#td_indcie_r").html($("#td_indcie").html());
	$("#td_estind_r").html($("#td_estind").html());
	$("#td_umind_r").html($("#td_umind").html());
	$("#td_valcie_r").html($("#td_valcie").html());


	$("#val_pim_r").html($("#val_pim").html());
	$("#val_efin_r").html($("#val_efin").html());
	$("#val_avan_r").html($("#val_avan").html());
	$("#por_avanacum_r").html($("#por_avanacum").html());
	$("#por_avananio_r").html($("#por_avananio").html());
	$("#sdo_ejecacum_r").html($("#sdo_ejecacum").html());
	$("#sdo_ejecanio_r").html($("#sdo_ejecanio").html());
	$("#pridev_r").html($("#pridev").html());
	$("#ultdev_r").html($("#ultdev").html());

	$("#des_pim_r").html($("#des_pim").html());
	$("#des_avan_r").html($("#des_avan").html());
	$("#des_avanacum_r").html($("#des_avanacum").html());
	$("#des_avanfinan_r").html($("#des_avanfinan").html());
	$("#des_sdoanio_r").html($("#des_sdoanio").html());
	 
}


function Descarga_Agregada() {
	var param_exp = {
		sect: gopc_sect, plie: gopc_gore, dpto: gopc_dpto, prov: gopc_prov, dist: gopc_dist, tipo: gopc_nivgob
	};

	console.log(param_exp);

	var totaPermitidoExportacion = 50000;
	var count = num_fil_grid;  

	if (count > totaPermitidoExportacion) {
		alert("El número máximo de registros permitidos en la exportación a excel es " + totaPermitidoExportacion);

		return;
	};

	$("#divPreload").show();

	var xhr = new XMLHttpRequest();
	xhr.responseType = 'blob';
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 2) {
			if (xhr.getResponseHeader("Content-Type") != null) {
				if (xhr.getResponseHeader("Content-Type").indexOf("application/json") >= 0) {
					xhr.responseType = "json";
				}
			}
		}
	};

	xhr.onload = function () {
		if (xhr.status === 200) {
			if (xhr.responseType == "json") {
				$("#divPreload").hide();
				alert("Ocurrió un error al descargar el archivo excel. Por favor intente nuevamente.<br/><br/>Si el error persiste contacte al administrador");

			} else {
				var filename = "";
				var disposition = xhr.getResponseHeader('Content-Disposition');

				if (disposition && disposition.indexOf('attachment') !== -1) {
					var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
					var matches = filenameRegex.exec(disposition);
					if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
				}

				var a = document.createElement('a');
				a.href = window.URL.createObjectURL(xhr.response); // xhr.response is a blob
				a.download = filename; // Set the file name.
				a.style.display = 'none';
				document.body.appendChild(a);
				a.click();
				delete a;

				$("#divPreload").hide();
			}

		} else {
			$("#divPreload").hide();

			alert("Ocurrió un error al descargar el archivo excel. Por favor intente nuevamente.<br/><br/>Si el error persiste contacte al administrador");

		}
	};

	xhr.onerror = function () {
		$("#divPreload").hide();
		alert("Ocurrió un error al descargar el archivo excel. Por favor intente nuevamente.<br/><br/>Si el error persiste contacte al administrador");
	};

	xhr.open('POST', "/inviertews/Ssi/expRepSSIDet", true);
	xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
	xhr.send(JSON.stringify(param_exp));

}

