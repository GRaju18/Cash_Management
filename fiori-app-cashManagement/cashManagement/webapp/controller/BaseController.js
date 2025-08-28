/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, UIComponent, History, MessageBox, Filter, FilterOperator) {
	"use strict";

	return Controller.extend("com.9b.cashManagement.controller.BaseController", {
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},
		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		cellClick: function (evt) {
			//	evt.getParameter("cellControl").getParent()._setSelected(true);
			var cellControl = evt.getParameter("cellControl");
			var isBinded = cellControl.getBindingContext("jsonModel");
			if (isBinded) {
				var oTable = evt.getParameter("cellControl").getParent().getParent();
				var sIndex = cellControl.getParent().getIndex();
				var sIndices = oTable.getSelectedIndices();
				if (sIndices.includes(sIndex)) {
					sIndices.splice(sIndices.indexOf(sIndex), 1);
				} else {
					sIndices.push(sIndex);
				}
				if (sIndices.length > 0) {
					jQuery.unique(sIndices);
					$.each(sIndices, function (i, e) {
						oTable.addSelectionInterval(e, e);
					});
				} else {
					oTable.clearSelection();
				}
			}

			//	oTable.setSelectionInterval(sIndex, sIndex);
		},
		removeDuplicates: function (arr) {
			return arr.reduce(function (acc, curr) {
				if (!acc.includes(curr))
					acc.push(curr);
				return acc;
			}, []);
		},
		getSystemDate: function (sDate) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var dateInAnyTimezone;
			if (sDate) {
				dateInAnyTimezone = new Date(sDate);
			} else {
				dateInAnyTimezone = new Date(); // Adjust the date and time as needed
			}

			var formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: jsonModel.getProperty("/sTimeZone")
			});
			var ISTDateString = formatter.format(dateInAnyTimezone);
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd",
				UTC: false
			});
			var systemDate = dateFormat.format(new Date(ISTDateString));
			return systemDate;
		},
		loadItemStrain: function (itemCode) {
			var groupCode = 137;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			var sFilters = "?$filter=ItemCode eq " + "'" + itemCode + "'";
			var sFields = "&$select=" + ["ItemName", "U_NSTNM", "ItemCode"].join();
			this.readServiecLayer("/b1s/v2/Items" + sFilters + sFields, function (data) {
				if (data.value.length > 0) {
					jsonModel.setProperty("/sItemStrain", data.value[0].U_NSTNM);
				} else {
					jsonModel.setProperty("/sItemStrain", "");
				}

			});
		},
		postBulkHarvestData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var bulkHarvestObj = jsonModel.getProperty("/bulkHarvestObj");
			var locationID = sap.ui.core.Fragment.byId("harvestB", "sRoom").getSelectedKey();
			var itemCode = sap.ui.core.Fragment.byId("harvestB", "harvstItem").getSelectedKey();
			var noOfPlants = bulkHarvestObj.NoOfPlants
			var enteredHarvest = bulkHarvestObj.enteredHarvest;
			var cartName = bulkHarvestObj.cartName;
			var cartWt = bulkHarvestObj.sCartKey;
			var hngrType = bulkHarvestObj.hangerType;
			var hgrsCount = bulkHarvestObj.noOfHgrs;
			var hngrWt = bulkHarvestObj.fHangerWt;
			var wetWeight = bulkHarvestObj.wetWight;
			var fWetWeight = bulkHarvestObj.fWetWt;
			//	var laborHrs = sap.ui.core.Fragment.byId("harvestB", "laborHrs").getValue();
			if (noOfPlants === "") {
				sap.m.MessageToast.show("Please enter No. of Plants");
				return;
			} else if (enteredHarvest === "") {
				sap.m.MessageToast.show("Please enter Harvest Name");
				return;
			} else if (cartName === "") {
				sap.m.MessageToast.show("Please Select Cart");
				return;
			} else if (hngrWt === "") {
				sap.m.MessageToast.show("Please Select Hanger Weight");
				return;
			} else if (wetWeight === "" || wetWeight <= "0" || wetWeight <= 0) {
				sap.m.MessageToast.show("Please enter gross weight greater than 0");
				return;
			} else if (locationID === "") {
				sap.m.MessageToast.show("Please Select Drying Location");
				return;
			} else if (fWetWeight <= "0" || fWetWeight <= 0) {
				sap.m.MessageToast.show("Net weigth must be greater than 0");
				return;
			}

			var locationName = sap.ui.core.Fragment.byId("harvestB", "sRoom").getSelectedItem().getText();
			var sLocation = sap.ui.core.Fragment.byId("harvestB", "sRoom").getSelectedItem();
			var sLocObj = sLocation.getBindingContext("jsonModel").getObject();
			var itemName = sap.ui.core.Fragment.byId("harvestB", "harvstItem").getSelectedItem().getText();
			//	var harvestMasterData = jsonModel.getProperty("/harvestMasterData");
			var itemObj = jsonModel.getProperty("/scannedTag");
			var cDate = this.convertUTCDateTime(new Date());
			var strainName = jsonModel.getProperty("/sItemStrain");
			var selItemCode = sap.ui.core.Fragment.byId("harvestB", "harvstItem").getSelectedKey();
			var selItemName = sap.ui.core.Fragment.byId("harvestB", "harvstItem").getSelectedItem().getText();

			var sLicence = jsonModel.getProperty("/sLinObj/U_MetrcLicense");
			var lFilters = "?$filter=U_NLFID eq " + "'" + sLicence + "' and U_NHBID eq " + "'" + enteredHarvest +
				"' and U_IsHarvested eq 'Yes'";
			jsonModel.setProperty("/busyView", true);
			sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(false);
			this.readServiecLayer("/b1s/v2/NPFET" + lFilters, function (harvestData) {
				var licenseNo = jsonModel.getProperty("/selectedLicense");
				if (harvestData.value.length === 0) {
					var payLoadCreateHarvest = {
						U_NHOWT: fWetWeight.toFixed(2), //total wt
						U_NWFWT: fWetWeight.toFixed(2), //wet weight
						//	U_NLCNM: locationName,
						U_NLOCD: sLocObj.Warehouse,
						U_NLCNM: sLocObj.AbsEntry,
						U_NSTNM: strainName,
						U_NPQTY: Number(noOfPlants),
						U_NHBID: enteredHarvest, //harvest name 
						//U_NCBID: itemObj.U_NCBID,
						//U_NHTID: itemObj.U_NPTID,
						U_WHSCODE: sLocObj.BinCode,
						U_NHEDT: cDate,
						U_NWSRP: "0",
						U_NBTST: "H",
						U_NLFID: licenseNo,
						U_NITCD: selItemCode.split("-")[0], //item code
						U_NITEM: selItemName, //item name
						U_NGRHWT: Number(wetWeight).toFixed(2),
						U_NCTTP: cartName,
						U_NCTWT: Number(Number(cartWt).toFixed(2)),
						U_NHNTP: hngrType,
						U_NHNWT: Number(hngrWt.toFixed(2)),
						U_NNOHN: Number(hgrsCount)
							//	U_NLABR: Number(laborHrs).toFixed(2)
					};
					var batchUrl = [],
						batchCallLines = [];
					batchCallLines.push(structuredClone(payLoadCreateHarvest));
					jsonModel.setProperty("/errorTxt", []);
					var scannedBatchPlants = jsonModel.getProperty("/scannedBatchPlants");
					batchUrl.push({
						url: "/b1s/v2/NPFETLINES",
						data: batchCallLines[0],
						method: "POST"
					});

					var sBincode = sLocObj.BinCode;

					var filters = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and U_NHBID eq '" + enteredHarvest + "'";
					this.readServiecLayer("/b1s/v2/NPFET" + filters + "&$orderby=DocNum desc", function (data) {
						delete payLoadCreateHarvest.U_NCTTP;
						delete payLoadCreateHarvest.U_NCTWT;
						delete payLoadCreateHarvest.U_NHNTP;
						delete payLoadCreateHarvest.U_NHNWT;
						delete payLoadCreateHarvest.U_NNOHN;
						if (data.value.length > 0) {
							if (data.value[0].U_WHSCODE == sBincode) {
								payLoadCreateHarvest.U_NPQTY = Number(payLoadCreateHarvest.U_NPQTY) + Number(data.value[0].U_NPQTY.toFixed(2));
								payLoadCreateHarvest.U_NGRHWT = Number(payLoadCreateHarvest.U_NGRHWT) + Number(data.value[0].U_NGRHWT.toFixed(2));
								payLoadCreateHarvest.U_NWFWT = Number(payLoadCreateHarvest.U_NWFWT) + Number(data.value[0].U_NWFWT.toFixed(2));
								payLoadCreateHarvest.U_NHOWT = Number(payLoadCreateHarvest.U_NHOWT) + Number(data.value[0].U_NHOWT.toFixed(2));
								that.updateServiecLayer("/b1s/v2/NPFET" + "(" + data.value[0].DocNum + ")", function () {}.bind(that),
									payLoadCreateHarvest, "PATCH");

								var Locations = jsonModel.getProperty("/Locations");
								$.grep(scannedBatchPlants, function (plant, sIndex) {
									if (sIndex < noOfPlants) {

										var payLoadInventoryEntry = {
											U_Phase: "Harvest",
											BatchAttribute1: enteredHarvest,
											//	U_Cart: cartName
										};
										batchUrl.push({
											url: "/b1s/v2/BatchNumberDetails(" + plant.BatchAbsEntry + ")",
											data: payLoadInventoryEntry,
											method: "PATCH"
										});

									}
								});

								jsonModel.setProperty("/busyView", true);
								that.createBatchCall(batchUrl, function () {
									var errorTxt = jsonModel.getProperty("/errorTxt");
									if (errorTxt.length > 0) {
										sap.m.MessageBox.error(errorTxt.join("\n"));
										jsonModel.setProperty("/busyView", false);
									} else {
										sap.m.MessageToast.show("Plant Status Changed Successfully");
									}
									that.bulkHarvestDialog.close();
									sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
									that.clearBulkHarvestData();
									that.loadMasterData();
									that.byId("cashManagementTable").setSelectedIndex(-1);
									jsonModel.setProperty("/scanTextHarvest", "Scan or Enter Harvest Name");
								});

							} else {
								jsonModel.setProperty("/busyView", false);
								// sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
								sap.m.MessageBox.error("Harvest batch already created in different location: " + data.value[0].U_WHSCODE);
							}

						} else {
							that.updateServiecLayer("/b1s/v2/NPFET", function () {}.bind(that),
								payLoadCreateHarvest, "POST");

							var Locations = jsonModel.getProperty("/Locations");
							$.grep(scannedBatchPlants, function (plant, sIndex) {
								if (sIndex < noOfPlants) {

									var payLoadInventoryEntry = {
										U_Phase: "Harvest",
										BatchAttribute1: enteredHarvest,
										//	U_Cart: cartName
									};
									batchUrl.push({
										url: "/b1s/v2/BatchNumberDetails(" + plant.BatchAbsEntry + ")",
										data: payLoadInventoryEntry,
										method: "PATCH"
									});

								}
							});

							jsonModel.setProperty("/busyView", true);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
									jsonModel.setProperty("/busyView", false);
								} else {
									sap.m.MessageToast.show("Plant Status Changed Successfully");
								}
								that.bulkHarvestDialog.close();
								sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
								that.clearBulkHarvestData();
								that.loadMasterData();
								that.byId("cashManagementTable").setSelectedIndex(-1);
								jsonModel.setProperty("/scanTextHarvest", "Scan or Enter Harvest Name");
							});

						}

					});

					// var Locations = jsonModel.getProperty("/Locations");
					// $.grep(scannedBatchPlants, function (plant, sIndex) {
					// 	if (sIndex < noOfPlants) {
					// 		/*				var AbslocationEntry;
					// 						$.each(Locations, function (i, obj) {
					// 							if (plant.BinLocationName.toLowerCase() == obj.Sublevel2.toLowerCase()) {
					// 								AbslocationEntry = obj.AbsEntry;
					// 							}
					// 						});
					// 						var DocumentLinesObj = {
					// 							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
					// 							"DocumentLines": [{
					// 								"ItemCode": plant.ItemCode,
					// 								"Quantity": 1,
					// 								"WarehouseCode": plant.WhsCode.split("-")[0],
					// 								"BatchNumbers": [{
					// 									"BatchNumber": plant.BatchNum,
					// 									"Quantity": 1
					// 								}],
					// 								"DocumentLinesBinAllocations": [{
					// 									//"BinAbsEntry": Number(locationID.split("-")[1]),
					// 									"BinAbsEntry": AbslocationEntry,
					// 									"Quantity": 1,
					// 									"SerialAndBatchNumbersBaseLine": 0
					// 								}]
					// 							}]
					// 						};
					// 						batchUrl.push({
					// 							url: "/b1s/v2/InventoryGenExits",
					// 							data: DocumentLinesObj,
					// 							method: "POST"
					// 						});*/

					// 		var payLoadInventoryEntry = {
					// 			U_Phase: "Harvest",
					// 			BatchAttribute1: enteredHarvest,
					// 			//	U_Cart: cartName
					// 		};
					// 		batchUrl.push({
					// 			url: "/b1s/v2/BatchNumberDetails(" + plant.BatchAbsEntry + ")",
					// 			data: payLoadInventoryEntry,
					// 			method: "PATCH"
					// 		});
					// 	}
					// });

					/*	var payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": []
						};
						payLoadInventory.DocumentLines.push({
							"ItemCode": selItemCode.split("-")[0], //<THIS IS SELECTED ITEM> 
							"WarehouseCode": locationID.split("-")[0],
							"Quantity": wetWeight, // <THIS IS THE QTY OF CLONES>
							"UnitPrice":selItemCode.split("-")[1],
							"BatchNumbers": [{
								"BatchNumber": itemObj.MnfSerial, // <THIS IS TAG>
								"Quantity": wetWeight, //<THIS IS THE QTY OF CLONES>
								"Location": locationID.split("-")[0], //<THIS IS FROM CLONE ROOM>
								"U_Phase":"Immature",
								"U_BatAttr3": itemObj.SourceUID, //source UID
								"ManufacturerSerialNumber": itemObj.MnfSerial //harvest name
							}],
							"DocumentLinesBinAllocations": [{
								"BinAbsEntry": locationID.split("-")[1],
								"Quantity": wetWeight,
								"SerialAndBatchNumbersBaseLine": 0
							}]
						});
						batchUrl.push({
							url: "/b1s/v2/InventoryGenEntries",
							data: payLoadInventory,
							method: "POST"
						});*/

					// jsonModel.setProperty("/busyView", true);
					// this.createBatchCall(batchUrl, function () {
					// 	var errorTxt = jsonModel.getProperty("/errorTxt");
					// 	if (errorTxt.length > 0) {
					// 		sap.m.MessageBox.error(errorTxt.join("\n"));
					// 		jsonModel.setProperty("/busyView", false);
					// 	} else {
					// 		sap.m.MessageToast.show("Plant Status Changed Successfully");
					// 	}
					// 	that.bulkHarvestDialog.close();
					// 	sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
					// 	that.clearBulkHarvestData();
					// 	that.loadMasterData();
					// 	that.byId("cashManagementTable").setSelectedIndex(-1);
					// 	jsonModel.setProperty("/scanTextHarvest", "Scan or Enter Harvest Name");
					// });

				} else {
					jsonModel.setProperty("/busyView", false);
					// sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
					sap.m.MessageToast.show("The entered Harvest Batch already exists. Please enter a different Harvest Batch.");
				}
			});

		},

		bulkHarvestLocationChange: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sLinObj = evt.getSource().getSelectedItem().getBindingContext("jsonModel").getObject();
			var sLocation = sLinObj.Warehouse + "-" + sLinObj.AbsEntry + "-" + sLinObj.BinCode;
			jsonModel.setProperty("/bulkHarvestObj/harvestRoom", sLocation);
			sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
		},

		bulkHarvestNameChange: function () {
			sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
		},

		convertUTCDateTime: function (date) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-ddThh:mm:ss",
				UTC: true
			});
			var postingDate = dateFormat.format(new Date(date));
			var finalDate = postingDate + "Z";
			return finalDate;
		},
		convertUTCDateMETRC: function (date) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd",
				UTC: true
			});
			var finalDate = dateFormat.format(new Date(date));
			return finalDate;
		},

		tokenUpdateMultiInput: function (oEvent) {
			this.fillFilterLoad(oEvent.getSource(), oEvent.getParameter("removedTokens")[0].getText());
		},

		/*Methods for multiInput for sarch field for scan functionality start*/
		onSubmitMultiInput: function (oEvent) {
			oEvent.getSource()._bUseDialog = false;
			var value = oEvent.getSource().getValue();
			if (!value) {
				this.fillFilterLoad(oEvent.getSource());
				return;
			}
			value = value.replace(/\^/g, "");
			oEvent.getSource().addToken(new sap.m.Token({
				key: value,
				text: value
			}));
			var orFilter = [];
			var andFilter = [];
			oEvent.getSource().setValue("");
			this.fillFilterLoad(oEvent.getSource());
		},

		onChangeMultiInput: function (oEvent) {
			oEvent.getSource()._bUseDialog = false;
			var value = oEvent.getSource().getValue();
			if (value.indexOf("^") !== -1) {
				value = value.replace(/\^/g, "");
				oEvent.getSource().addToken(new sap.m.Token({
					key: value,
					text: value
				}));
				var orFilter = [];
				var andFilter = [];
				oEvent.getSource().setValue("");
				this.fillFilterLoad(oEvent.getSource());
			}
		},

		daysInRoom: function (date) {
			var cDate = new Date();
			var cTime = cDate.getTime();
			if (date) {
				var vTime = date.getTime();
				var days = Math.floor((cTime - vTime) / 8.64e+7);
				return days;
			}
		},

		prepareVizKPIData: function (data, field) {
			var arr = [];
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "YYYYMMdd",
				UTC: true
			});
			var tDay = new Date();

			var oneDayPast = new Date();
			oneDayPast.setDate(oneDayPast.getDate() - 1);

			var day10 = new Date();
			day10.setDate(day10.getDate() - 10);

			var day20 = new Date();
			day20.setDate(day20.getDate() - 20);

			arr = [{
				DATETXT: "Today",
				DAYS: 0,
				FIELDNAME: "DAYS",
				LABEL: "0"
			}, {
				DATETXT: "1 - 10",
				DAYS: 0,
				FIELDNAME: "DAYS",
				LABEL: "1"
			}, {
				DATETXT: "11 - 20",
				DAYS: 0,
				FIELDNAME: "DAYS",
				LABEL: "2"
			}, {
				DATETXT: ">20",
				DAYS: 0,
				FIELDNAME: "DAYS",
				LABEL: "3"
			}];
			$.each(data, function (i, info) {
				var index = 1;
				if (info[field]) {
					if (dateFormat.format(new Date(info[field])) === dateFormat.format(tDay)) {
						info.DAYS = "0";
						index = 0;
					} else
					if (dateFormat.format(new Date(info[field])) < dateFormat.format(tDay) && dateFormat.format(new Date(info[field])) >=
						dateFormat.format(day10)) {
						info.DAYS = "1";
						index = 1;
					} else
					if (dateFormat.format(new Date(info[field])) < dateFormat.format(day10) && dateFormat.format(new Date(info[field])) >=
						dateFormat.format(day20)) {
						info.DAYS = "2";
						index = 2;
					} else if (dateFormat.format(new Date(info[field])) < dateFormat.format(day20)) {
						info.DAYS = "3";
						index = 3;
					}
					arr[index].DAYS = arr[index].DAYS + 1;
				}
			});
			arr[0].DAYS = arr[0].DAYS.toString();
			arr[1].DAYS = arr[1].DAYS.toString();
			arr[2].DAYS = arr[2].DAYS.toString();
			arr[3].DAYS = arr[3].DAYS.toString();
			this.getOwnerComponent().getModel("jsonModel").setProperty("/flowTableData", data);
			return arr;
		},

		getAppConfigData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/configData", {
				V_EBL: false,
				V_BHT: false
			});
			var filters = "?$filter=U_NAPP eq 'Flower Planner' or U_NAPP eq 'AllApps'";
			this.readServiecLayer("/b1s/v2/U_NCNFG" + filters, function (data) {
				if (data.value.length > 0) {
					var configObj = {};
					$.each(data.value, function (i, e) {
						if (e.U_NFLDS === "Manicure") {
							configObj.V_EBL = e.U_NVSBL === "Y" ? true : false;
						} else if (e.U_NFLDS === "Bulk Harvest") {
							configObj.V_BHT = e.U_NVSBL === "Y" ? true : false;
						} else if (e.U_NFLDS === "WasteUOM") {
							var wasteUOM = e.U_NVALUE;
							if (wasteUOM !== "") {
								try {
									var wasteUOMJson = JSON.parse(wasteUOM);
									jsonModel.setProperty("/uomVals", wasteUOMJson);

								} catch (error) {
									sap.m.MessageToast.show(error);
								}
							}
						} else if (e.U_NFLDS === "Date/Time") {
							jsonModel.setProperty("/sTimeZone", e.U_NVALUE);
						} else if (e.U_NFLDS === "METRC Status") {
							var MetrcOnOff = e.U_NVSBL === "Y" ? true : false;
							jsonModel.setProperty("/MetrcOnOff", MetrcOnOff);
						} else if (e.Name === "DisableButtons") {
							jsonModel.setProperty("/buttonsAccess", e.U_NVALUE);
						}
					});
					jsonModel.setProperty("/configData", configObj);
				}
			});
		},

		createBatchCall: function (batchUrl, callBack) {
			var jsonModel = this.getView().getModel("jsonModel");
			var splitBatch, count;
			count = Math.ceil(batchUrl.length / 100);
			jsonModel.setProperty("/count", count);
			if (batchUrl.length > 100) {
				do {
					splitBatch = batchUrl.splice(0, 100);
					this.callBatchService(splitBatch, callBack);
				} while (batchUrl.length > 100);
				if (batchUrl.length > 0) {
					this.callBatchService(batchUrl, callBack);
				}
			} else {
				this.callBatchService(batchUrl, callBack);
			}
			//	callBack.call(this, errorMessage);
		},

		callBatchService: function (batchUrl, callBack) {
			var reqHeader = "--clone_batch--\r\nContent-Type: application/http \r\nContent-Transfer-Encoding:binary\r\n\r\n";
			var payLoad = reqHeader;
			$.each(batchUrl, function (i, sObj) {
				payLoad = payLoad + sObj.method + " " + sObj.url + "\r\n\r\n";
				payLoad = payLoad + JSON.stringify(sObj.data) + "\r\n\r\n";
				if (batchUrl.length - 1 === i) {
					payLoad = payLoad + "\r\n--clone_batch--";
				} else {
					payLoad = payLoad + reqHeader;
				}
			});
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var baseUrl = jsonModel.getProperty("/serLayerbaseUrl");
			//	var sessionID = jsonModel.getProperty("/sessionID");
			if (location.host.indexOf("webide") === -1) {
				baseUrl = "";
			}
			var settings = {
				"url": baseUrl + "/b1s/v2/$batch",
				"method": "POST",
				xhrFields: {
					withCredentials: true
				},
				//"timeout": 0,
				"headers": {
					"Content-Type": "multipart/mixed;boundary=clone_batch"
				},
				//	setCookies: "B1SESSION=" + sessionID,
				"data": payLoad,
				success: function (res) {
					var count = jsonModel.getProperty("/count");
					count--;
					jsonModel.setProperty("/count", count);

					var errorCapture, logData;
					if (res.includes("error") == true) {
						errorCapture = res.split("message")[2];
						logData = {
							Api: "Batch calls",
							methodType: "POST",
							Desttype: "SL",
							errorText: errorCapture,
							data: payLoad,
							statusTxt: 400
						};
					} else {
						// errorCapture = res;
						logData = {
							Api: "Batch calls",
							methodType: "POST",
							Desttype: "SL",
							errorText: "",
							data: payLoad,
							statusTxt: 200
						};
					}

					that.CaptureLog(logData);

					try {
						var errorMessage = "";
						res.split("\r").forEach(function (sString) {
							if (sString.indexOf("error") !== -1) {
								var oString = JSON.parse(sString.replace(/\n/g, ""));
								errorMessage = oString.error.message;
							}
						});
					} catch (err) {
						//	console.log("error " + err);
					}
					//	callBack.call(that, res, errorMessage);
					if (errorMessage) {
						var errorTxt = jsonModel.getProperty("/errorTxt");
						errorTxt.push(errorMessage);
						jsonModel.setProperty("/errorTxt", errorTxt);
					}
					if (count === 0) {
						callBack.call(that, errorMessage);
					}
				},
				error: function (error) {
					var count = jsonModel.getProperty("/count");
					count--;
					jsonModel.setProperty("/count", count);
					if (count === 0) {
						callBack.call(that);
					}
					if (error.statusText) {
						MessageBox.error(error.statusText);
					} else if (error.responseJSON) {
						MessageBox.error(error.responseJSON.error.message.value);
					}
				}
			};
			//	const text = '{"name":"John\n", "birth":"14/12/1989\t"}';
			//	const result = text.escapeSpecialCharsInJSONString();
			//	console.log(result);
			$.ajax(settings).done(function () {
				//	console.log(response);
			});
		},

		readServiecLayer: function (entity, callBack) {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sessionID = jsonModel.getProperty("/sessionID");
			if (location.host.indexOf("webide") !== -1) {
				if (sessionID === undefined) {
					var loginPayLoad = jsonModel.getProperty("/userAuthPayload");
					loginPayLoad = JSON.stringify(loginPayLoad);
					$.ajax({
						url: jsonModel.getProperty("/serLayerbaseUrl") + "/b1s/v2/Login",
						data: loginPayLoad,
						type: "POST",
						xhrFields: {
							withCredentials: true
						},
						dataType: "json", // expecting json response
						success: function (data) {
							jsonModel.setProperty("/sessionID", data.SessionId);
							//	var sessionID = that.getOwnerComponent().getModel("jsonModel").getProperty("/sessionID");
							$.ajax({
								type: "GET",
								xhrFields: {
									withCredentials: true
								},
								url: jsonModel.getProperty("/serLayerbaseUrl") + entity,
								setCookies: "B1SESSION=" + data.SessionId,
								dataType: "json",
								success: function (res) {
									callBack.call(that, res);
								},
								error: function (error) {
									jsonModel.setProperty("/busyView", false);
									MessageBox.error(error.responseJSON.error.message.value);
								}
							});
						},
						error: function () {
							jsonModel.setProperty("/busyView", false);
							sap.m.MessageToast.show("Error with authentication");
						}
					});
				} else {

					$.ajax({
						type: "GET",
						xhrFields: {
							withCredentials: true
						},
						url: jsonModel.getProperty("/serLayerbaseUrl") + entity,
						//	setCookies: "B1SESSION=" + sessionID,
						dataType: "json",
						success: function (res) {
							callBack.call(that, res);
						},
						error: function (error) {
							jsonModel.setProperty("/busyView", false);
							MessageBox.error(error.responseJSON.error.message.value);
						}
					});
				}
			} else {
				$.ajax({
					type: "GET",
					xhrFields: {
						withCredentials: true
					},
					url: entity,
					//	setCookies: "B1SESSION=" + sessionID,
					dataType: "json",
					success: function (res) {
						callBack.call(that, res);
					},
					error: function (error) {
						jsonModel.setProperty("/busyView", false);
						MessageBox.error(error.responseJSON.error.message.value);
					}
				});
			}
		},

		updateServiecLayer: function (entity, callBack, payLoad, method) {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			payLoad = JSON.stringify(payLoad);
			var sUrl;
			if (location.host.indexOf("webide") !== -1) {
				sUrl = jsonModel.getProperty("/serLayerbaseUrl") + entity;
			} else {
				sUrl = entity;
			}
			$.ajax({
				type: method,
				xhrFields: {
					withCredentials: true
				},
				url: sUrl,
				//	setCookies: "B1SESSION=" + sessionID,
				dataType: "json",
				data: payLoad,
				success: function (res) {
					callBack.call(that, res);
					var docEntry;
					if (res == undefined) {
						docEntry = "";
					} else {
						docEntry = res.DocEntry;
					}
					var logData = {
						Api: entity,
						methodType: method,
						Desttype: "SL",
						errorText: docEntry,
						data: payLoad,
						statusTxt: 200
					};
					that.CaptureLog(logData);
				},
				error: function (error) {
					jsonModel.setProperty("/busyView", false);
					MessageBox.error(error.responseJSON.error.message.value);

					var logData = {
						Api: entity,
						methodType: method,
						Desttype: "SL",
						errorText: error.responseJSON.error.message,
						data: payLoad,
						statusTxt: 400
					};
					that.CaptureLog(logData);
				}
			});
		},

		CaptureLog: function (LogData) {
			if (LogData.statusTxt !== 200) {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				// var errorLogData = jsonModel.getProperty("/ErrorLogData");
				// errorLogData.push({
				// 	Api: LogData.Api,
				// 	Desttype: LogData.Desttype,
				// 	errorText: LogData.errorText,
				// 	//	colorCode: colorCode
				// });
				// jsonModel.setProperty("/ErrorLogData", errorLogData);
			}
			if (LogData.Desttype === "METRC") {
				this.createMetricLog(LogData.Api, LogData.methodType, LogData.data, LogData.errorText, LogData.statusTxt);
			} else {
				this.createSLLog(LogData.Api, LogData.methodType, LogData.data, LogData.errorText, LogData.statusTxt);
			}
		},

		createSLLog: function (sUrl, method, reqPayload, resPayload, statusCode) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");

			var payLoad = {
				U_NDTTM: this.convertUTCDate(new Date()),
				U_NUSID: jsonModel.getProperty("/userName"),
				U_NLGMT: method,
				U_NLURL: sUrl,
				U_NLGBD: JSON.stringify(reqPayload),
				U_NLGRP: JSON.stringify(resPayload),
				U_NLGST: statusCode,
				U_NAPP: "FP"
			};
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			payLoad = JSON.stringify(payLoad);
			var sUrl, entity = "/b1s/v2/NBNLG";
			if (location.host.indexOf("webide") !== -1) {
				sUrl = jsonModel.getProperty("/serLayerbaseUrl") + entity;
			} else {
				sUrl = entity;
			}

			$.ajax({
				type: "POST",
				xhrFields: {
					withCredentials: true
				},
				url: sUrl,
				//	setCookies: "B1SESSION=" + sessionID,
				dataType: "json",
				data: payLoad,
				success: function (res) {

				},
				error: function (error) {

				}
			});

		},

		getMetricsCredentials: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters = "?$filter=U_NITTP eq 'METRC'";
			jsonModel.setProperty("/metrcBusy", true);
			jsonModel.setProperty("/enableSyncNow", false);
			this.readServiecLayer("/b1s/v2/NINGT" + filters, function (data) {
				jsonModel.setProperty("/metrcBusy", false);
				if (data.value.length > 0) {
					jsonModel.setProperty("/metrcData", data.value[0]);
					if (data.value[0].U_NACST === "X") {
						jsonModel.setProperty("/METRCText", "Metrc Sync is ON");
						jsonModel.setProperty("/METRCColorCode", 7);
						that.getCurrentFacilties();
					} else {
						jsonModel.setProperty("/METRCText", "Metrc Sync is OFF");
						jsonModel.setProperty("/METRCColorCode", 3);
						jsonModel.setProperty("/METRCKey", "METRC Key Invalid");
						jsonModel.setProperty("/METRCColorKey", 3);
						// that.loadMasterLocations();
					}
				} else {
					jsonModel.setProperty("/metrcData", {});
					jsonModel.setProperty("/METRCText", "Metrc Sync is OFF");
					jsonModel.setProperty("/METRCColorCode", 3);
					jsonModel.setProperty("/METRCKey", "METRC Key Invalid");
					jsonModel.setProperty("/METRCColorKey", 3);
					// that.loadMasterLocations();
				}
			});
		},
		// getCurrentFacilties: function () {
		// 	var that = this;
		// 	var jsonModel = this.getOwnerComponent().getModel("jsonModel");
		// 	this.readServiecLayer("/b1s/v2/UsersService_GetCurrentUser", function (data) {
		// 		var metrcData = jsonModel.getProperty("/metrcData");
		// 		jsonModel.setProperty("/apiKey", data.U_APIKey);
		// 		if (metrcData !== undefined && !jQuery.isEmptyObject(metrcData)) {
		// 			$.ajax({
		// 				type: "GET",
		// 				async: false,
		// 				url: metrcData.U_NIURL + "/facilities/v2",
		// 				contentType: "application/json",
		// 				headers: {
		// 					"Authorization": "Basic " + btoa(metrcData.U_NVNDK + ":" + data.U_APIKey)
		// 				},
		// 				success: function (facilities) {
		// 					jsonModel.setProperty("/METRCKey", "METRC Key Valid");
		// 					jsonModel.setProperty("/METRCColorKey", 7);
		// 				},
		// 				error: function () {
		// 					jsonModel.setProperty("/METRCKey", "METRC Key Invalid");
		// 					jsonModel.setProperty("/METRCColorKey", 3);
		// 				}
		// 			});
		// 		}
		// 	});
		// },

		getCurrentFacilties: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			this.readServiecLayer("/b1s/v2/UsersService_GetCurrentUser", function (data) {
				var metrcData = jsonModel.getProperty("/metrcData");
				jsonModel.setProperty("/apiKey", data.U_APIKey);
				// var userAccessLicense = JSON.parse(data.U_License);
				// if (userAccessLicense != null) {
				// 	jsonModel.setProperty("/userAccessLicense", userAccessLicense);
				// }
				// that.loadMasterLocations();
				if (metrcData !== undefined && !jQuery.isEmptyObject(metrcData)) {
					$.ajax({
						type: "GET",
						async: false,
						url: metrcData.U_NIURL + "/facilities/v2",
						contentType: "application/json",
						headers: {
							"Authorization": "Basic " + btoa(metrcData.U_NVNDK + ":" + data.U_APIKey)
						},
						success: function (facilities) {
							jsonModel.setProperty("/METRCKey", "METRC Key Valid");
							jsonModel.setProperty("/METRCColorKey", 7);
						},
						error: function () {
							jsonModel.setProperty("/METRCKey", "METRC Key Invalid");
							jsonModel.setProperty("/METRCColorKey", 3);
						}
					});
				}
			});
		},

		callMetricsService: function (entity, methodType, data, success, error) {
			var that = this;
			// var obj = this.getView().getModel("jsonModel").getProperty("/selectedMetrics");
			var metricConfig = this.getView().getModel("jsonModel").getProperty("/metrcData");
			var apiKey = this.getView().getModel("jsonModel").getProperty("/apiKey");
			$.ajax({
				data: JSON.stringify(data),
				type: methodType,
				//	async: false,
				url: metricConfig.U_NIURL + entity,
				contentType: "application/json",
				headers: {
					"Authorization": "Basic " + btoa(metricConfig.U_NVNDK + ":" + apiKey)
				},
				success: function (sRes) {
					that.createMetricLog(entity, methodType, data, sRes, "200");
					success.call(that, sRes);
				},
				error: function (eRes) {
					//	error.bind(this);
					var errorMsg = "";
					/*if (eRes.statusText) {
						errorMsg = eRes.statusText;
					} else*/

					if (eRes.responseJSON && eRes.responseJSON.length > 0) {
						$.each(eRes.responseJSON, function (i, e) {
							errorMsg = errorMsg + e.message + "\n";
							that.popUpData(e.message, "E");
						});
					} else if (eRes.responseJSON && eRes.responseJSON.Message) {
						errorMsg = eRes.responseJSON.Message;
						that.popUpData(errorMsg, "E");
					} else if (eRes.statusText && eRes.status === 401) {
						errorMsg = "Unauthorized";
						that.popUpData(errorMsg, "E");
					} else if (eRes.statusText) {
						errorMsg = eRes.statusText;
						that.popUpData(errorMsg, "E");
					}
					error.call(that, errorMsg);
					that.createMetricLog(entity, methodType, data, errorMsg, eRes.status);
					sap.m.MessageToast.show(errorMsg);
				}
			});
		},

		callMetricsGETService: function (entity, success, error) {
			var that = this;
			// var obj = this.getView().getModel("jsonModel").getProperty("/selectedMetrics");
			var metricConfig = this.getView().getModel("jsonModel").getProperty("/metrcData");
			var apiKey = this.getView().getModel("jsonModel").getProperty("/apiKey");
			$.ajax({
				type: "GET",
				async: false,
				url: metricConfig.U_NIURL + entity,
				contentType: "application/json",
				headers: {
					"Authorization": "Basic " + btoa(metricConfig.U_NVNDK + ":" + apiKey)
				},
				success: function (sRes) {
					success.call(that, sRes);
				},
				error: function (eRes) {
					var errorMsg = "";
					if (eRes.responseJSON && eRes.responseJSON.length > 0) {
						$.each(eRes.responseJSON, function (i, e) {
							errorMsg = errorMsg + e.message + "\n";
							that.popUpData(e.message, "E");
						});
					} else if (eRes.responseJSON && eRes.responseJSON.Message) {
						errorMsg = eRes.responseJSON.Message;
						that.popUpData(errorMsg, "E");
					} else if (eRes.statusText && eRes.status === 401) {
						errorMsg = "Unauthorized";
						that.popUpData(errorMsg, "E");
					} else if (eRes.statusText) {
						errorMsg = eRes.statusText;
						that.popUpData(errorMsg, "E");
					}

					error.call(that, errorMsg);
					sap.m.MessageToast.show(errorMsg);
				}
			});
		},
		// capture metric log
		createMetricLog: function (sUrl, method, reqPayload, resPayload, statusCode) {
			var data = {
				U_NDTTM: this.convertUTCDate(new Date()),
				U_NUSID: this.getView().getModel("jsonModel").getProperty("/userName"),
				U_NLGMT: method,
				U_NLURL: sUrl,
				U_NLGBD: JSON.stringify(reqPayload),
				U_NLGRP: JSON.stringify(resPayload),
				U_NLGST: statusCode,
				U_NAPP: "FP"
			};
			this.updateServiecLayer("/b1s/v2/NMTLG", function () {}.bind(this), data, "POST");
		},

		convertUTCDate: function (date) {
			date.setHours(new Date().getHours());
			date.setMinutes(new Date().getMinutes());
			date.setSeconds(new Date().getSeconds());
			var utc = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
			return utc;
		},

		hanldeMessageDialog: function (evt) {
			var that = this;
			var oMessageTemplate = new sap.m.MessageItem({
				type: '{type}',
				title: '{title}',
				description: '{description}'
			});
			this.oMessageView = new sap.m.MessageView({
				showDetailsPageHeader: true,
				itemSelect: function () {

				},
				items: {
					path: "/responseData",
					template: oMessageTemplate
				}
			});
			var resModel = new sap.ui.model.json.JSONModel();
			resModel.setProperty("/responseData", []);
			this.resModel = resModel;
			var oCloseButton = new sap.m.Button({
					text: "Close",
					press: function () {
						that._oPopover.close();
					}
				}).addStyleClass("sapUiTinyMarginEnd"),
				clearButton = new sap.m.Button({
					text: "Clear",
					press: function () {
						that.oMessageView.navigateBack();
						that.resModel.setProperty("/responseData", []);
					}
				}),
				oPopoverFooter = new sap.m.Bar({
					contentRight: [clearButton, oCloseButton]
				}),
				oPopoverBar = new sap.m.Bar({
					//	contentLeft: [oBackButton],
					contentMiddle: [
						new sap.m.Title({
							text: "Messages"
						})
					]
				});

			this._oPopover = new sap.m.Popover({
				customHeader: oPopoverBar,
				contentWidth: "440px",
				contentHeight: "440px",
				verticalScrolling: false,
				modal: true,
				content: [this.oMessageView],
				footer: oPopoverFooter
			});
			this._oPopover.setModel(resModel);
		},
		handleOpenPopOver: function (evt) {
			this._oPopover.openBy(evt.getSource());
		},
		popUpData: function (title, type) {
			var sObj = {
				type: type === "E" ? "Error" : "Success",
				title: title
			};
			var responseData = this.resModel.getProperty("/responseData");
			responseData.push(sObj);
			this.resModel.setProperty("/responseData", responseData);
			this._oPopover.setModel(this.resModel);
			var resPop = this.getView().byId("resPop");
			this.oMessageView.navigateBack();
			resPop.firePress();
		},
		validateSuggetion: function (evt) {
			this.onSelectHgrs();
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var wetWight = jsonModel.getProperty("/bulkHarvestObj/wetWight");
			var sValue = evt.getParameter("value");
			var suggestItems = evt.getSource().getSuggestionItems();
			var rObj = $.grep(suggestItems, function (sItem) {
				if (sItem.getText() === sValue) {
					return sItem;
				}
			});
			if (rObj.length === 0) {
				evt.getSource().setValueState("Error");
				evt.getSource().setValueStateText("Invalid Entry");
				evt.getSource().focus();
			} else {
				evt.getSource().setValueState("None");
			}
			if (rObj && rObj.length > 0) {
				if (wetWight) {
					var finalWt;
					var cartWt = jsonModel.getProperty("/bulkHarvestObj/sCartKey");
					var hangetWt = jsonModel.getProperty("/bulkHarvestObj/fHangerWt");
					if (wetWight != "NaN" && cartWt != "NaN" && hangetWt != "NaN") {
						finalWt = Number(wetWight) - Number(cartWt) - Number(hangetWt);
					} else {
						finalWt = 0;
					}

					finalWt = Number(finalWt.toFixed(2));
					jsonModel.setProperty("/bulkHarvestObj/fWetWt", finalWt);
				}
			}
		},
		batchResponse: function () {
			var A3 = function (x, a) {
				var b = x.getAllResponseHeaders();
				if (!b) {
					var D3 = x.getResponseHeader("Content-Type");
					var e = x.getResponseHeader("Content-Length");
					if (D3) {
						a["Content-Type"] = D3;
					}
					if (e) {
						a["Content-Length"] = e;
					}
				} else {
					b = b.split(/\r?\n/);
					var i, p;
					for (i = 0,
						p = b.length; i < p; i++) {
						if (b[i]) {
							var y = b[i].match(/([^:]*):\s*((?:\s*\S+)+)?\s*/);
							a[y[1]] = y[2];
						}
					}
				}
			};
		},
		updateServiceLayerBatch: function (entity, callBack, payLoad, method) {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sessionID = jsonModel.getProperty("/sessionID");
			var sUrl;
			if (location.host.includes("webide") == true) {
				sUrl = jsonModel.getProperty("/serLayerbaseUrl") + entity;
			} else {
				sUrl = entity;
			}
			payLoad = JSON.stringify(payLoad);
			$.ajax({
				type: method,
				xhrFields: {
					withCredentials: true
				},
				url: sUrl,
				setCookies: "B1SESSION=" + sessionID,
				dataType: "json",
				data: payLoad,
				success: function (res) {
					callBack.call(that, res);
					var docEntry;
					if (res == undefined) {
						docEntry = "";
					} else {
						docEntry = res.DocEntry;
					}
					var logData = {
						Api: entity,
						methodType: method,
						Desttype: "SL",
						errorText: docEntry,
						data: payLoad,
						statusTxt: 200
					};
					that.CaptureLog(logData);
				},
				error: function (error) {
					callBack.call(that, error);
					var logData = {
						Api: entity,
						methodType: method,
						Desttype: "SL",
						errorText: error.responseJSON.error.message,
						data: payLoad,
						statusTxt: 400
					};
					that.CaptureLog(logData);
				}
			});
		},
		getMetrcTags: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var metrcData = jsonModel.getProperty("/metrcData");
			if (metrcData && metrcData.U_NACST === "X") {
				var that = this;
				var licenseNo = jsonModel.getProperty("/selectedLicense");
				var metrcUrl = "/tags/v2/plant/available?licenseNumber=" + jsonModel.getProperty("/selectedLicense");
				this.callMetricsGETService(metrcUrl, function (itemData) {
					jsonModel.setProperty("/metrcTags", itemData);
				}, function (error) {
					sap.m.MessageToast.show(JSON.stringify(error));
				});
			}
		},
		validateTag: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var metrcData = jsonModel.getProperty("/metrcData");
			var eTag = evt.getParameter("value");
			var sPath = evt.getSource().getBindingContext("jsonModel").getPath();
			var sLObj = evt.getSource().getBindingContext("jsonModel").getObject();
			var newpkg = [];
			var linesData = evt.getSource().getModel("jsonModel").getProperty("/updateMTagData");
			var metrcTags = jsonModel.getProperty("/metrcTags");
			$.each(linesData, function (i, e) {
				if (e.newTag && e.newTag !== "Select a New Tag") {
					newpkg.push(e.newTag);
				}
			});
			var checkState, newTagStatus;
			var duplicatesArr = this.checkForDuplicates(newpkg);
			if (duplicatesArr.indexOf(eTag) !== -1) {
				sLObj.statusTag = "Error";
				sLObj.tagStatusTxt = "Duplicate tags found";
			} else {
				if (metrcData && metrcData.U_NACST === "X") {
					let isAviable = metrcTags.filter((tags) => tags.Label === eTag);
					if (isAviable && isAviable.length > 0) {
						sLObj.statusTag = "None";
						sLObj.tagStatusTxt = "";
						sLObj.isTagValid = true;
					} else {
						sLObj.statusTag = "Error";
						sLObj.tagStatusTxt = "Invalid Tag";
						sLObj.isTagValid = false;
					}
				} else {
					sLObj.statusTag = "None";
					sLObj.tagStatusTxt = "";
					sLObj.isTagValid = true;
				}

				jsonModel.setProperty(sPath, sLObj);
			}
		},
		checkForDuplicates: function (arr) {
			return arr.filter((item, index) => arr.indexOf(item) !== index);
		},

	});
});