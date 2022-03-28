// (c) 2014 Don Coleman
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* global mainPage, deviceList, refreshButton */
/* global detailPage, batteryState, batteryStateButton, disconnectButton */
/* global ble  */
/* jshint browser: true , devel: true*/
//Tomado de https://github.com/don/cordova-plugin-ble-central
'use strict';

/*
var battery = {
    service: "180F",
    level: "2A19"
};*/

var lectura = null;
var itemOrient = {};
var n =0;
var b = 0;
var itemObject = [];//Lista promedio de rssi por dispositivo
var itemObject2 = [];//Lista promedio de rssi por dispositivo
var itemRSSI = [];//Lista de lectura de rssi
var p1, p2, p3;
var dispositivos = [];//Lista de sispositivos ble

/*var dispositivos = [{"uid":"AC:23:3F:72:6E:F9","x": 2.5,"y": 0,"z": 4},
{"uid": "AC:23:3F:72:6E:FA", "x": 0,"y": 0, "z": 4},
{"uid": "AC:23:3F:72:6E:F7", "x": 0, "y": 3, "z": 4},
{"uid": "AC:23:3F:72:6E:F8", "x": 1.5, "y": 5, "z": 4}]*/


var app = {
    
    initialize: function() {
        this.bindEvents();
        detailPage.hidden = true;
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
		//window.addEventListener("deviceorientationabsolute",this.orientacion, false);
		refreshButton.addEventListener('touchstart', this.deviceList, false);//Boton Refrescar
    },
    onDeviceReady: function() {
		getsensores();
    },
    
    deviceList: function() {
		b = 0;//contador de iteraciones de inicio de scaneo 5 veces//
		itemObject = [];//Lista promedio de rssi por dispositivo
		itemObject2 = [];//Lista promedio de rssi por dispositivo
		itemRSSI = [];//Lista de lectura de rssi
        deviceList.innerHTML = ''; // vacía la lista del html
		app.ScanDevice();
	},

	ScanDevice: function() {
				n =0;
				ble.startScan([],app.onDiscoverDevice, app.onError);
	  },

    onDiscoverDevice: function(device) {
		for(var i=0; i<dispositivos.features.length; i++){
			if(device.id == dispositivos.features[i].properties.uid){
				n ++;
				var itemDisp = {};
				itemDisp.uid = device.id;
				itemDisp.x = dispositivos.features[i].properties.x;
				itemDisp.y = dispositivos.features[i].properties.y;
				itemDisp.z = dispositivos.features[i].properties.z;
				app.agruparJSON(itemObject,itemDisp);//Funcion para agrupar json de los dispositivos detectados del sistema

				var itemArray = {};
				itemArray.rssi = device.rssi;
				itemArray.uid = device.id;
				app.agruparJSON(itemRSSI,itemArray);//Funcion para agrupar los valores rssi de los dispositivos detectados

				if (n==4){
					b ++;
					ble.stopScan();
					var listItem = document.createElement('p'),
					html = 'Ciclo:' + b;
						listItem.dataset.deviceId = device.id;  // TODO
					listItem.innerHTML = html;
					dispositivosid.appendChild(listItem);

					if (b<5){
						app.ScanDevice();
					}
					else{
					app.printHtml(itemRSSI,Rssi);
					app.generarEstadisticos();
					}
					//app.lecturaRSSI();
				}
				//break
			}
		}
    },

	agruparJSON: function(jsonDestino,json) {
        jsonDestino.push(json);
    },

	orientacion: function(event) {
		resulOrient.innerHTML = '';
		itemOrient = event;
		//html = 'alpha:'+itemOrient.alpha+'beta :'+itemOrient.beta+'gamma:'+itemOrient.gamma
		app.printHtml('alpha:'+itemOrient.alpha+'beta :'+itemOrient.beta+'gamma:'+itemOrient.gamma,resulOrient);
	},


    printHtml: function(valor,segmentohtml) {
        var texto1 = document.createElement('p');
		texto1.innerHTML = JSON.stringify(valor);
        segmentohtml.appendChild(texto1);
    },

	generarEstadisticos: function() {
		//Funcion para agrupar valores leidos de rssi
		var groupBy = function (miarray, prop) {
			return miarray.reduce(function(groups, item) {
				var val = item[prop];
				groups[val] = groups[val] || {uid: item.uid, sum_rssi: 0, num: 0};
				groups[val].sum_rssi += item.rssi;
				groups[val].num = groups[val].num + 1;

				return groups;
			}, {});
		}
		var list = Object.values(groupBy(itemRSSI,'uid'));

		for(var i=0; i<list.length; i++){
			var rssidevice = app.getFilteredByKey(itemRSSI, "uid", list[i]["uid"]);
			rssidevice.sort( app.predicateBy("rssi"));
			list[i]["rssi_md"] = app.median(rssidevice)
		};

		list.forEach( function( lista ){
			lista.rssi_m = parseInt(lista.sum_rssi/lista.num);
			lista.r = app.calDistancia(lista.rssi_md);//app.calDistancia(parseInt(device.rssi))
			lista.w1 = 1/lista.r;
			lista.w = lista.w1/app.suma(list,"w1");
		  });
		
		var sumaw1 = app.suma(list,"w1");

		list.forEach( function( lista ){
			lista.w = lista.w1/sumaw1;
		  });

		list.sort( app.predicateBy("r"));

		list.forEach(function(item){
			var itemObject2 = itemObject.find(function(lista) {
				return lista.uid === item.uid;
			});
			Object.assign(item, itemObject2);
		});

		itemObject2 = list;

		itemObject2.forEach( function( lista ){
			lista.xw = lista.w*lista.x;
			lista.yw = lista.w*lista.y;
			lista.zw = lista.w*lista.z;
		  });
		
		app.printHtml(itemObject2,resultadoid);

		//app.printHtml(trilaterate(itemObject2[0],itemObject2[1],itemObject2[2],true),ubicacionid)
		var ubipond = {x:app.suma(itemObject2,"xw"),y:app.suma(itemObject2,"yw"),z:app.suma(itemObject2,"zw")}
		app.printHtml(ubipond,ubicacionpondeid)
		/*
		{
			x: a.x + b.x,
			y: a.y + b.y,
			z: a.z + b.z
		}*/
		//DibujarCuirculos();
		
    },


	getFilteredByKey: function (array, key, value) {
		return array.filter(function(e) {
			return e[key] == value;
		});
	},
	

	suma: function (list,parametro) {
		var sum = 0;
		for (var i = 0; i < list.length; i++){
			
			sum +=list[i][parametro]
		}
		return sum
	},

	median: function (list) {
	var lowMiddle = Math.floor((list.length - 1) / 2);
	var highMiddle = Math.ceil((list.length - 1) / 2);
	var median = (list[lowMiddle]["rssi"] + list[highMiddle]["rssi"]) / 2;
	return median
	},


    calDistancia: function(num) {
        return Math.pow(10,((num-(-56))/(-10*3)));//Calculo de distancia  apartir del RSSI//Cómo presentar la formula segun recomendaciones de fabricante.
    },//quizas pueden cambiar de acuerdo a las condiciones ambientales de cada espacio.


	ordenarJSON: function(list,atributo) {
        list.sort(function (a, b) {//Ordena de acuerdo a un atrributo especificado
            if (a.atributo > b.atributo) {
              return 1;
            }
            if (a.atributo < b.atributo) {
              return -1;
            }
            // a must be equal to b
            return 0;
          });
    },


	predicateBy: function (prop){
		return function(a,b){
		   if( a[prop] > b[prop]){
			   return 1;
		   }else if( a[prop] < b[prop] ){
			   return -1;
		   }
		   return 0;
		}
	 },

    onError: function(reason) {
        alert("ERROR: " + reason); // real apps should use notification.alert
    }
};


function trilaterate (p1, p2, p3, return_middle) {

	function sqr(a)
	{
		return a * a;
	}
	
	function norm(a)
	{
		return Math.sqrt(sqr(a.x) + sqr(a.y) + sqr(a.z));
	}
	
	function dot(a, b)
	{
		return a.x * b.x + a.y * b.y + a.z * b.z;
	}
	
	function vector_subtract(a, b)
	{
		return {
			x: a.x - b.x,
			y: a.y - b.y,
			z: a.z - b.z
		};
	}
	
	function vector_add(a, b)
	{
		return {
			x: a.x + b.x,
			y: a.y + b.y,
			z: a.z + b.z
		};
	}
	
	function vector_divide(a, b)
	{
		return {
			x: a.x / b,
			y: a.y / b,
			z: a.z / b
		};
	}
	
	function vector_multiply(a, b)
	{
		return {
			x: a.x * b,
			y: a.y * b,
			z: a.z * b
		};
	}
	
	function vector_cross(a, b)
	{
		return {
			x: a.y * b.z - a.z * b.y,
			y: a.z * b.x - a.x * b.z,
			z: a.x * b.y - a.y * b.x
		};
	}

	var ex, ey, ez, i, j, d, a, x, y, z, b, p4;

	ex = vector_divide(vector_subtract(p2, p1), norm(vector_subtract(p2, p1)));
	
	i = dot(ex, vector_subtract(p3, p1));
	a = vector_subtract(vector_subtract(p3, p1), vector_multiply(ex, i));
	ey = vector_divide(a, norm(a));
	ez =  vector_cross(ex, ey);
	d = norm(vector_subtract(p2, p1));
	j = dot(ey, vector_subtract(p3, p1));

	x = (sqr(p1.r) - sqr(p2.r) + sqr(d)) / (2 * d);
	y = (sqr(p1.r) - sqr(p3.r) + sqr(i) + sqr(j)) / (2 * j) - (i / j) * x;
	b = sqr(p1.r) - sqr(x) - sqr(y);

	if (Math.abs(b) < 0.0000000001)
	{
		b = 0;
	}
	
	z = Math.sqrt(b);

	if (isNaN(z))
	{
		return null;
	}
	
	a = vector_add(p1, vector_add(vector_multiply(ex, x), vector_multiply(ey, y)));
	
	var p4a = vector_add(a, vector_multiply(ez, z));
	var p4b = vector_subtract(a, vector_multiply(ez, z));

	if (z == 0 || return_middle)
	{
		return a;
	}
	else
	{
		return [ p4a, p4b ];
	}	
}

/*
function DibujarCuirculos() {
	var lienzo = document.getElementById("circulo");
		if (lienzo && lienzo.getContext) {
		var contexto = lienzo.getContext("2d");
			if (contexto) {

					var X = itemObject2[0]["x"]/-30000;
					var X = itemObject2[0]["y"]/3000;
					var r = itemObject2[0]["z"]*100;

					contexto.strokeStyle = "#006400";
					contexto.fillStyle = "#6ab150";
					contexto.lineWidth = 5;
					contexto.arc(X,Y,r,0,2*Math.PI);
					contexto.fill();
					contexto.stroke();
			}
		}
 }*/

function getsensores() {
	
	var url = `https://18.189.53.106/api/rpc/sensores?`;
    $.ajax({
        url: url,
        success: handleResult,
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			alert("Error en la solicitud al servicio REST");
		 }		
    }); // use promises

    function handleResult(result){
		dispositivos = result
		alert("Servicio conectado")
		//alert(dispositivos.features[0].properties.uid)
		//alert(dispositivos)
    }
};
