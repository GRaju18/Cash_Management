sap.ui.define([
	"com/9b/cashManagement/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/cashManagement/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/m/MessageBox",
	"com/9b/cashManagement/control/jsbarcode",
	"sap/ui/core/format/DateFormat",
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, MessageBox, jsbarcode, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.cashManagement.controller.CashManagement", {
		formatter: model,

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 */
		onInit: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			this.getAppConfigData();
			this.hanldeMessageDialog();
			var cashManagementTable = this.getView().byId("cashManagementTable");
			var tableHeader = this.byId("tableHeader");
			cashManagementTable.addEventDelegate({
				onAfterRendering: function () {
					var oBinding = this.getBinding("rows");
					oBinding.attachChange(function (oEvent) {
						var oSource = oEvent.getSource();
						var count = oSource.iLength; //Will fetch you the filtered rows length
						var totalCount = oSource.oList.length;
						tableHeader.setText("Items (" + count + "/" + totalCount + ")");
					});
				}
			}, cashManagementTable);
			this.combinedFilter = [];
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
			var that = this;
			setInterval(function () {
				that.loadMasterData();
			}, 1800000);
		},
		/*
		 * Method Called when we call routing and navigate to flowering page.
		 */
		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "flowPlanner") {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				this.getView().byId("cashManagementTable").clearSelection();
				this.pageFrom = oEvent.getParameter("arguments").vRoom;
				this.byId("searchFieldTable")._bUseDialog = false;
				jsonModel.setProperty("/oStartDate", new Date());
				jsonModel.setProperty("/oEndDate", new Date());
				this.loadLicenseData();
			}
		},

		loadLicenseData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");

			this.readServiecLayer("/b1s/v2/U_SNBLIC", function (data) {

				data.value.sort((a, b) => a.Name.localeCompare(b.Name));
				jsonModel.setProperty("/snblicenseData", data.value);
				jsonModel.setProperty("/temSelectLicense", data.value[0].Name);
				jsonModel.setProperty("/SelectLicenseValue", data.value[0].Name + " - " + data.value[0].Code);

				if (data.value.length > 0) {
					jsonModel.setProperty("/temSelectLicense", data.value[0].Code);
				} else {
					jsonModel.setProperty("/temSelectLicense", "");
				}
				that.loadwithoutFilterCashManagement();
			});

		},

		loadwithoutFilterCashManagement: function () {

			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var that = this;
			var oStartDate = jsonModel.getProperty("/oStartDate");
			var oEndDate = jsonModel.getProperty("/oEndDate");
			var dateFormat = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddTHH:mm:ss'Z'",
				UTC: false,
			});
			var dateFormatInside = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-dd",
				UTC: false,
			});
			var fStartDate = dateFormat.format(oStartDate);
			var fEndDate = dateFormat.format(oEndDate);

			if ((oStartDate == "" || oStartDate == undefined) && (oEndDate == "" || oEndDate == undefined)) {
				const today = new Date().toISOString().split("T")[0];
				const startOfDay = new Date(today + "T00:00:00Z");
				const endOfDay = new Date(today + "T23:59:59Z");
				fStartDate = startOfDay.toISOString();
				fEndDate = endOfDay.toISOString();
				jsonModel.setProperty("/oStartDate", startOfDay);
				jsonModel.setProperty("/oEndDate", endOfDay);
			}
			var filers = "?$filter=U_DATE ge '" + fStartDate + "' and U_DATE le '" + fEndDate + "'";
			var orderBy = "&$orderby=U_TIME desc";
			var date = new Date();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd'T'HH:mm:ss",
				UTC: false,
			});
			var postingDate = dateFormat.format(date);
			this.readServiecLayer("/b1s/v2/CASHREGISTER" + filers + orderBy, function (data) {
				const uniqueById = data.value.filter(
					(obj, index, self) =>
					index === self.findIndex((o) => o.U_REGISTERID === obj.U_REGISTERID)
				);
				uniqueById.sort((a, b) => a.U_REGISTERID ?.localeCompare(b.U_REGISTERID));
				jsonModel.setProperty("/registerCompressData", uniqueById);
				if (uniqueById.length > 0) {
					jsonModel.setProperty("/temSelectRegister", uniqueById[0].U_REGISTERID);
				} else {
					jsonModel.setProperty("/temSelectRegister", "");
				}

				that.loadFilterBasedCashManagement(false);

			});
		},

		loadFilterBasedCashManagement: function (clearRegister) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var that = this;
			that.byId("dynamicPageId").setBusy(true);
			var filers = "";
			var orderBy = "&$orderby=U_TIME desc";
			if (!clearRegister) {
				clearRegister = false;
			}

			var temSelectRegister = jsonModel.getProperty("/temSelectRegister");
			var temSelectLicense = jsonModel.getProperty("/temSelectLicense");

			var oStartDate = jsonModel.getProperty("/oStartDate");
			var oEndDate = jsonModel.getProperty("/oEndDate");
			var dateFormat = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddTHH:mm:ss'Z'",
				UTC: false,
			});
			var dateFormatInside = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-dd",
				UTC: false,
			});
			var fStartDate = dateFormat.format(oStartDate);
			var fEndDate = dateFormat.format(oEndDate);

			if ((oStartDate == "" || oStartDate == undefined) && (oEndDate == "" || oEndDate == undefined)) {
				const today = new Date().toISOString().split("T")[0];
				const startOfDay = new Date(today + "T00:00:00Z");
				const endOfDay = new Date(today + "T23:59:59Z");
				fStartDate = startOfDay.toISOString();
				fEndDate = endOfDay.toISOString();
				jsonModel.setProperty("/oStartDate", startOfDay);
				jsonModel.setProperty("/oEndDate", endOfDay);
			}

			if (!temSelectLicense && !temSelectRegister) {
				filers = "?$filter=U_DATE ge '" + fStartDate + "' and U_DATE le '" + fEndDate + "'";
			}

			if (!!temSelectLicense && !!temSelectRegister) {
				filers = "?$filter=U_DATE ge '" + fStartDate + "' and U_DATE le '" + fEndDate + "' and U_NLFID eq '" + temSelectLicense +
					"' and U_REGISTERID eq '" + temSelectRegister + "'";
			}

			if (!!temSelectLicense && !!temSelectRegister == false) {
				filers = "?$filter=U_DATE ge '" + fStartDate + "' and U_DATE le '" + fEndDate + "' and U_NLFID eq '" + temSelectLicense + "'";
			}

			if (!!temSelectLicense == false && !!temSelectRegister) {
				filers = "?$filter=U_DATE ge '" + fStartDate + "' and U_DATE le '" + fEndDate + "' and U_REGISTERID eq '" + temSelectRegister +
					"'";
			}

			that.byId("dynamicPageId").setBusy(true);

			var date = new Date();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd'T'HH:mm:ss",
				UTC: false,
			});
			var postingDate = dateFormat.format(date);
			this.readServiecLayer("/b1s/v2/CASHREGISTER" + filers + orderBy, function (data) {
				that.byId("dynamicPageId").setBusy(false);
				const uniqueById = data.value.filter((obj, index, self) =>
					index === self.findIndex((o) => o.U_REGISTERID === obj.U_REGISTERID)
				);

				if (uniqueById.length > 0) {
					uniqueById.sort((a, b) => a.U_REGISTERID ?.localeCompare(b.U_REGISTERID));
					jsonModel.setProperty("/registerCompressData", uniqueById);
					jsonModel.setProperty("/temSelectRegister", uniqueById[0].U_REGISTERID);
					
					var previousData = jsonModel.getProperty("/temSelectRegister");
					if (!previousData) {
						jsonModel.setProperty("/temSelectRegister", "");
					}
				} else {
					var previousData = jsonModel.getProperty("/temSelectRegister");
					if (!previousData) {
						jsonModel.setProperty("/temSelectRegister", "");
						jsonModel.setProperty("/registerCompressData", "");
					}
				}

				if (clearRegister == true) {
					jsonModel.setProperty("/temSelectRegister", "");
				}

				var arr = [],
					veVal = 0,
					neVal = 0;
				$.each(data.value, function (i, e) {
					var dateFormatInside = DateFormat.getDateInstance({
						pattern: "MM-dd-yyyy",
						UTC: false,
					});
					var postingDateInside = dateFormatInside.format(new Date(e.U_DATE.replace("Z", "")));
					e.formatU_DATE = postingDateInside;

					if (
						e.U_TRANSACTIONTYPE == "CashIn" ||
						e.U_TRANSACTIONTYPE == "Cash In" ||
						e.U_TRANSACTIONTYPE == "Cash in"
					) {
						e.infoLable = 7;
						e.CASHINICON = "+";

						veVal = veVal + Number(e.U_AMOUNT);
					}

					if (
						e.U_TRANSACTIONTYPE == "CashOut" ||
						e.U_TRANSACTIONTYPE == "Cash Out" ||
						e.U_TRANSACTIONTYPE == "Cash out"
					) {
						e.infoLable = 3;
						e.CASHINICON = "-";

						neVal = neVal + Number(e.U_AMOUNT);
					}

					if (e.U_TRANSACTIONTYPE == "Opening amount") {
						e.infoLable = 5;
						e.CASHINICON = "+";

						veVal = veVal + Number(e.U_AMOUNT);
					}

					if (e.U_TRANSACTIONTYPE == "Closing amount") {
						e.infoLable = 1;
						e.CASHINICON = "-";
						neVal = neVal + Number(e.U_AMOUNT);
					}

					arr.push(e);
				});

				var num = Number(veVal) - Number(neVal);
				jsonModel.setProperty("/totalCashManageInput", num.toFixed(2));

				jsonModel.setProperty("/cashManagementData", arr);

			});

		},

		clearAllFilters: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var that = this;
			var filterTable = this.getView().byId("cashManagementTable");
			var aColumns = filterTable.getColumns();
			for (var i = 0; i <= aColumns.length; i++) {
				filterTable.filter(aColumns[i], null);
			}
			this.byId("searchFieldTable").removeAllTokens();
			
			jsonModel.setProperty("/temSelectRegister", "");
			jsonModel.setProperty("/temSelectLicense", "");
			jsonModel.setProperty("/SelectLicenseValue", "");
			jsonModel.setProperty("/oStartDate", new Date());
			jsonModel.setProperty("/oEndDate", new Date())
			jsonModel.refresh(true);

			this.loadFilterBasedCashManagement(true);

		},

		onSearchLicense: function (evt) {
			var oItem = evt.getParameter("suggestionItem");
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			if (oItem) {
				var sObj = oItem.getBindingContext("jsonModel").getObject();
				// jsonModel.setProperty("/sLinObj", sObj);
				jsonModel.setProperty("/temSelectLicense", sObj.Code);
				jsonModel.setProperty("/SelectLicenseValue", sObj.Name + " - " + sObj.Code);

			} else if (evt.getParameter("clearButtonPressed")) {
				evt.getSource().fireSuggest();

			}
		},

		onSuggestLicense: function (event) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var that = this;
			this.oSF = this.getView().byId("licenseDropDown");
			var sValue = event.getParameter("suggestValue"),
				aFilters = [];
			if (sValue) {
				aFilters = [
					new Filter([
						new Filter("Name", function (sText) {
							return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
						}),
						new Filter("Code", function (sText) {
							return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
						})

					], false)
				];
				
			} else {
				jsonModel.setProperty("/temSelectLicense", "");
			}
			
			that.oSF.getBinding("suggestionItems").filter(aFilters);
			that.oSF.suggest();

		},

		onSearchRegister: function (evt) {
			var oItem = evt.getParameter("suggestionItem");
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			if (oItem) {
				var sObj = oItem.getBindingContext("jsonModel").getObject();
				// jsonModel.setProperty("/sLinObj", sObj);
				jsonModel.setProperty("/temSelectRegister", sObj.U_REGISTERID);

			} else if (evt.getParameter("clearButtonPressed")) {
				evt.getSource().fireSuggest();

			}
		},

		onSuggestRegister: function (event) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var that = this;
			this.oSFR = this.getView().byId("registerDropDown");
			var sValue = event.getParameter("suggestValue"),
				aFilters = [];
			if (sValue) {
				aFilters = [
					new Filter([
						new Filter("U_REGISTERID", function (sText) {
							return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
						})

					], false)
				];

			} else {
				jsonModel.setProperty("/temSelectRegister", "");
			}
			
			that.oSFR.getBinding("suggestionItems").filter(aFilters);
			that.oSFR.suggest();

		},

		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {
					orFilter.push(new sap.ui.model.Filter("formatU_DATE", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_REGISTERID", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_SALESEMPLOYEE", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_TRANSACTIONTYPE", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_TRANSACTIONREASON", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_AMOUNT", "Contains", value.toLowerCase()));

					andFilter.push(new sap.ui.model.Filter({
						filters: orFilter,
						and: false,
						caseSensitive: false
					}));
				}
			});
			this.byId("cashManagementTable").getBinding("rows").filter(andFilter);
		},

	});
});