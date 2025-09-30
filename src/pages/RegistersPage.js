import React, { useState } from "react";
import { useSelector } from "react-redux";

import {
  Box,
  Grid,
  Typography,
  Button,
  Divider,
  Input,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions
} from "@material-ui/core";

import {
  useTranslations,
  ConstantBasedPicker,
  baseApiUrl,
  ProgressOrError,
  apiHeaders,
} from "@openimis/fe-core";
import Block from "../components/Block";
import Uploader from "../components/Uploader";
import {
  STRATEGY_INSERT,
  STRATEGY_INSERT_UPDATE,
  STRATEGY_INSERT_UPDATE_DELETE,
  STRATEGY_UPDATE,
  RIGHT_REGISTERS_DIAGNOSES,
  RIGHT_REGISTERS_HEALTH_FACILITIES,
  RIGHT_REGISTERS_LOCATIONS,
  RIGHT_REGISTERS_ITEMS,
  RIGHT_REGISTERS_SERVICES,
  RIGHT_REGISTERS_INSUREES,
  EXPORT_TYPE_XLSX,
  EXPORT_TYPE_XLS,
  EXPORT_TYPE_JSON,
  EXPORT_TYPE_CSV,
  EXPORT_TYPE_XML,
  INSUREES_TYPE,
  LOCATIONS_TYPE,
  DIAGNOSIS_TYPE,
  HF_TYPE,
  ITEMS_TYPE,
  SERVICES_TYPE,
} from "../constants";

const DIAGNOSES_STRATEGIES = [
  STRATEGY_INSERT,
  STRATEGY_UPDATE,
  STRATEGY_INSERT_UPDATE,
  STRATEGY_INSERT_UPDATE_DELETE,
];
const LOCATIONS_STRATEGIES = [
  STRATEGY_INSERT,
  STRATEGY_UPDATE,
  STRATEGY_INSERT_UPDATE,
];
const HEALTH_FACILITIES_STRATEGIES = LOCATIONS_STRATEGIES;
const INSUREES_STRATEGIES = LOCATIONS_STRATEGIES;
const MEDICAL_ITEMS_STRATEGIES = DIAGNOSES_STRATEGIES;
const MEDICAL_SERVICES_STRATEGIES = DIAGNOSES_STRATEGIES;
const EXPORT_TYPES = [
  EXPORT_TYPE_CSV,
  EXPORT_TYPE_JSON,
  EXPORT_TYPE_XLS,
  EXPORT_TYPE_XLSX,
  EXPORT_TYPE_XML,
];
const INSUREE_EXPORT_TYPES = [
  EXPORT_TYPE_CSV,
  EXPORT_TYPE_JSON,
  EXPORT_TYPE_XLS,
  EXPORT_TYPE_XLSX,
];

const RegistersPage = () => {
  const { formatMessage } = useTranslations("tools.RegistersPage");
  const [forms, setForms] = useState({});
  const rights = useSelector((state) => state.core?.user?.i_user?.rights ?? []);
  const [dialogState, setDialogState] = useState({});
  const [popupState, setPopupState] = useState({});
  const REGISTERS_URL = `${baseApiUrl}/tools/registers`;
  const EXPORTS_URL = `${baseApiUrl}/tools/exports`;
  const IMPORTS_URL = `${baseApiUrl}/tools/imports`;
  const INSUREES_IMPORT_URL = `${baseApiUrl}/im_export/imports`;
  const INSUREES_EXPORT_URL = `${baseApiUrl}/im_export/exports`;

  const hasRights = (rightsList) => rightsList.every((x) => rights.includes(x));

  const handleFieldChange = (formName, fieldName, value) => {
    setForms({
      ...forms,
      [formName]: {
        ...(forms[formName] ?? {}),
        [fieldName]: value,
      },
    });
  };

  const onRegisterDownload = (register, format) => (e) => {
    if (format === EXPORT_TYPE_XML) {
      window.open(`${REGISTERS_URL}/download_${register}`);
    } else if (register === INSUREES_TYPE) {
      window.open(`${INSUREES_EXPORT_URL}/${register}?file_format=${format}`);
    } else {
      window.open(`${EXPORTS_URL}/${register}?file_format=${format}`);
    }
  };

  const openPopup = (e, uploadType) => {
    setPopupState({
      open: true,
      openLocations: uploadType === LOCATIONS_TYPE,
      openDiagnosis: uploadType === DIAGNOSIS_TYPE,
      openHF: uploadType === HF_TYPE,
      openItems: uploadType === ITEMS_TYPE,
      openServices: uploadType === SERVICES_TYPE,
      openInsurees: uploadType === INSUREES_TYPE,
      anchorEl: e.currentTarget,
      error: null,
    });
  };

  const onPopupClose = (e) => {
    setPopupState({
      open: false,
      openLocations: false,
      openDiagnosis: false,
      openHF: false,
      openItems: false,
      openServices: false,
      openInsurees: false,
      anchorEl: null,
      error: null,
    });
  };


  const onDialogClose = (reason) => {
    if (reason === "escapeKeyDown" || reason === "backdropClick") {
      return;
    }
    setDialogState({ open: false });
  };

  const appendProperties = (formData, dryRun, strategy) => {
    formData.append("dry_run", dryRun);
    formData.append("strategy", strategy);
  };

  const onSubmit = async (values, register) => {
    setDialogState({
      open: true,
      isLoading: true,
      data: null,
      error: null,
    });
    setPopupState({
      open: false,
      anchorEl: null,
      error: null,
    });
    const fileFormat = values.file.type;
    let formData = new FormData();
    formData.append("file", values.file);

    let url_import;

    if (fileFormat.includes("/xml")) {
      appendProperties(formData, Boolean(values.dryRun), values.strategy);
      url_import = `${REGISTERS_URL}/upload_${register}`;
    } else if (register === INSUREES_TYPE) {
      appendProperties(formData, Boolean(values.dryRun), values.strategy);
      url_import = `${INSUREES_IMPORT_URL}/${register}`;
    } else {
      url_import = `${IMPORTS_URL}/${register}`;
    }

    try {
      const response = await fetch(url_import, {
        headers: apiHeaders,
        body: formData,
        method: "POST",
        credentials: "same-origin",
      });

      const payload = await response.json();

      if (response.status >= 400) {
        setDialogState({
          open: true,
          isLoading: false,
          data: {
            success: payload.success,
          },
          generalError:
            payload.error && `Error ${response.status}: ${payload.error}`,
        });
        return;
      }

      setDialogState({
        open: true,
        isLoading: false,
        success: payload.success,
        data: payload.data,
        generalError: payload.error,
        uploadErrors: payload.errors,
      });
    } catch (error) {
      setDialogState({
        open: true,
        isLoading: false,
        data: null,
        generalError:
          error?.message ??
          formatMessage(
            `An error occurred. Please contact your administrator. ${error?.message}`
          ),
      });
    }
  };
  console.log("TOOLS RENDERING")
  return (
    <>
      {dialogState?.open && (
        <Dialog open onClose={onDialogClose} fullWidth maxWidth="sm">
          <DialogTitle>{formatMessage("UploadDialog.title")}</DialogTitle>
          <DialogContent>
            <ProgressOrError progress={dialogState.isLoading} />
            {dialogState.generalError && (
              <Box my={1}>{dialogState.generalError}</Box>
            )}
            {!dialogState.isLoading && dialogState.data && (
              <>
                <Box my={1}>
                  <b>Status:</b>
                  {dialogState.success
                    ? formatMessage("UploadDialog.success")
                    : formatMessage("UploadDialog.failure")}
                </Box>
                {"sent" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.sent")}</b>
                    {dialogState.data.sent}
                  </Box>
                )}
                {"created" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.created")}</b>
                    {dialogState.data.created}
                  </Box>
                )}
                {"updated" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.updated")}</b>
                    {dialogState.data.updated}
                  </Box>
                )}
                {"deleted" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.deleted")}</b>
                    {dialogState.data.deleted}
                  </Box>
                )}
                {"skipped" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.skipped")}</b>
                    {dialogState.data.skipped}
                  </Box>
                )}
                {"invalid" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.invalid")}</b>
                    {dialogState.data.invalid}
                  </Box>
                )}
                {"failed" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.failed")}</b>
                    {dialogState.data.failed}
                  </Box>
                )}
                {dialogState.uploadErrors?.length > 0 && (
                  <Box my={1}>
                    <b>{formatMessage("UploadDialog.errors")}</b>
                    {dialogState.uploadErrors.join(", ")}
                  </Box>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              disabled={dialogState.isLoading}
              onClick={onDialogClose}
              variant="primary"
            >
              {formatMessage("UploadDialog.okButton")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Box fullWidth m={2}>
        <Grid container spacing={2}>
          {/**
          {hasRights(RIGHT_REGISTERS_DIAGNOSES) && (
            <Grid item xs={4}>
              <Block title={formatMessage("diagnosesBlockTitle")}>
                <Grid container spacing={2} direction="column">
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={onRegisterDownload("diagnoses", EXPORT_TYPE_XML)}
                    >
                      {formatMessage("downloadBtn")}
                    </Button>
                  </Grid>
                  <Grid item>
                    <Divider fullWidth />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("diagnoses.uploadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <Grid item>
                          <Input
                            onChange={(event) =>
                              handleFieldChange(
                                "diagnoses",
                                "file",
                                event.target.files[0]
                              )
                            }
                            required
                            id="import-button"
                            inputProps={{
                              accept: ".xml, application/xml, text/xml",
                            }}
                            type="file"
                          />
                        </Grid>
                        <Grid item>
                          <ConstantBasedPicker
                            module="tools"
                            label="strategyPicker"
                            onChange={(value) =>
                              handleFieldChange("diagnoses", "strategy", value)
                            }
                            required
                            constants={DIAGNOSES_STRATEGIES}
                            withNull={false}
                          />
                        </Grid>
                        <Grid item>
                          <FormControlLabel
                            label={formatMessage("dryRunLabel")}
                            control={
                              <Checkbox
                                checked={forms.diagnoses?.dryRun}
                                onChange={(e) =>
                                  handleFieldChange(
                                    "diagnoses",
                                    "dryRun",
                                    e.target.checked
                                  )
                                }
                              />
                            }
                          />
                        </Grid>
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => openPopup(e, DIAGNOSIS_TYPE)}
                            disabled={
                              !(
                                forms.diagnoses?.file &&
                                forms.diagnoses?.strategy
                              )
                            }
                          >
                            {formatMessage("uploadBtn")}
                          </Button>
                          {popupState?.open && popupState?.openDiagnosis && (
                            <Dialog
                              open
                              onClose={onPopupClose}
                              fullWidth
                              maxWidth="sm"
                            >
                              <DialogTitle>
                                {formatMessage("UploadDialog.confirmDiagnoses")}
                              </DialogTitle>
                              <DialogActions>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() =>
                                    onSubmit(forms.diagnoses, "diagnoses")
                                  }
                                  disabled={
                                    !(
                                      forms.diagnoses?.file &&
                                      forms.diagnoses?.strategy
                                    )
                                  }
                                >
                                  {formatMessage("uploadBtn")}
                                </Button>
                                <Button
                                  onClick={onPopupClose}
                                  variant="contained"
                                >
                                  {formatMessage("cancelBtn")}
                                </Button>
                              </DialogActions>
                            </Dialog>
                          )}
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                </Grid>
              </Block>
            </Grid>
          )}**/}
          {hasRights(RIGHT_REGISTERS_LOCATIONS) && (
            <Grid item xs={4}>
              <Block title={formatMessage("locationsBlockTitle")}>
                <Grid container spacing={2} direction="column">
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={onRegisterDownload(
                        LOCATIONS_TYPE,
                        EXPORT_TYPE_XML
                      )}
                    >
                      {formatMessage("downloadBtn")}
                    </Button>
                  </Grid>
                  <Grid item>
                    <Divider fullWidth />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("locations.uploadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <Grid item>
                          <Input
                            onChange={(event) =>
                              handleFieldChange(
                                LOCATIONS_TYPE,
                                "file",
                                event.target.files[0]
                              )
                            }
                            required
                            id="import-button"
                            inputProps={{
                              accept: ".xml, application/xml, text/xml",
                            }}
                            type="file"
                          />
                        </Grid>
                        <Grid item>
                          <ConstantBasedPicker
                            module="tools"
                            label="strategyPicker"
                            onChange={(value) =>
                              handleFieldChange(
                                LOCATIONS_TYPE,
                                "strategy",
                                value
                              )
                            }
                            required
                            constants={LOCATIONS_STRATEGIES}
                            withNull={false}
                          />
                        </Grid>
                        <Grid item>
                          <FormControlLabel
                            label={formatMessage("dryRunLabel")}
                            control={
                              <Checkbox
                                checked={forms.locations?.dryRun}
                                onChange={(e) =>
                                  handleFieldChange(
                                    LOCATIONS_TYPE,
                                    "dryRun",
                                    e.target.checked
                                  )
                                }
                              />
                            }
                          />
                        </Grid>
                        <Grid item>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => openPopup(e, LOCATIONS_TYPE)}
                            disabled={
                              !(
                                forms.locations?.file &&
                                forms.locations?.strategy
                              )
                            }
                          >
                            {formatMessage("uploadBtn")}
                          </Button>
                          {popupState?.open && popupState?.openLocations && (
                            <Dialog
                              open
                              onClose={onPopupClose}
                              fullWidth
                              maxWidth="sm"
                            >
                              <DialogTitle>
                                {formatMessage("UploadDialog.confirmLocations")}
                              </DialogTitle>
                              <DialogActions>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() =>
                                    onSubmit(forms.locations, LOCATIONS_TYPE)
                                  }
                                  disabled={
                                    !(
                                      forms.locations?.file &&
                                      forms.locations?.strategy
                                    )
                                  }
                                >
                                  {formatMessage("uploadBtn")}
                                </Button>
                                <Button
                                  onClick={onPopupClose}
                                  variant="contained"
                                >
                                  {formatMessage("cancelBtn")}
                                </Button>
                              </DialogActions>
                            </Dialog>
                          )}
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                </Grid>
              </Block>
            </Grid>
          )}
          {/*
          {hasRights(RIGHT_REGISTERS_HEALTH_FACILITIES) && (
            <Grid item xs={4}>
              <Block title={formatMessage("healthFacilitiesBlockTitle")}>
                <Grid container spacing={2} direction="column">
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={onRegisterDownload(
                        "healthfacilities",
                        EXPORT_TYPE_XML
                      )}
                    >
                      {formatMessage("downloadBtn")}
                    </Button>
                  </Grid>
                  <Grid item>
                    <Divider fullWidth />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("healthFacilities.uploadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <Grid item>
                          <Input
                            onChange={(event) =>
                              handleFieldChange(
                                "healthFacilities",
                                "file",
                                event.target.files[0]
                              )
                            }
                            required
                            id="import-button"
                            inputProps={{
                              accept: ".xml, application/xml, text/xml",
                            }}
                            type="file"
                          />
                        </Grid>
                        <Grid item>
                          <ConstantBasedPicker
                            module="tools"
                            label="strategyPicker"
                            onChange={(value) =>
                              handleFieldChange(
                                "healthFacilities",
                                "strategy",
                                value
                              )
                            }
                            required
                            constants={HEALTH_FACILITIES_STRATEGIES}
                            withNull={false}
                          />
                        </Grid>
                        <Grid item>
                          <FormControlLabel
                            label={formatMessage("dryRunLabel")}
                            control={
                              <Checkbox
                                checked={forms.healthFacilities?.dryRun}
                                onChange={(e) =>
                                  handleFieldChange(
                                    "healthFacilities",
                                    "dryRun",
                                    e.target.checked
                                  )
                                }
                              />
                            }
                          />
                        </Grid>
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => openPopup(e, HF_TYPE)}
                            disabled={
                              !(
                                forms.healthFacilities?.file &&
                                forms.healthFacilities?.strategy
                              )
                            }
                          >
                            {formatMessage("uploadBtn")}
                          </Button>
                          {popupState?.open && popupState?.openHF && (
                            <Dialog
                              open
                              onClose={onPopupClose}
                              fullWidth
                              maxWidth="sm"
                            >
                              <DialogTitle>
                                {formatMessage("UploadDialog.confirmHF")}
                              </DialogTitle>
                              <DialogActions>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() =>
                                    onSubmit(
                                      forms.healthFacilities,
                                      "healthfacilities"
                                    )
                                  }
                                  disabled={
                                    !(
                                      forms.healthFacilities?.file &&
                                      forms.healthFacilities?.strategy
                                    )
                                  }
                                >
                                  {formatMessage("uploadBtn")}
                                </Button>
                                <Button
                                  onClick={onPopupClose}
                                  variant="contained"
                                >
                                  {formatMessage("cancelBtn")}
                                </Button>
                              </DialogActions>
                            </Dialog>
                          )}
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                </Grid>
              </Block>
            </Grid>
          )}
          {hasRights(RIGHT_REGISTERS_INSUREES) && (
            <Uploader
              acceptableFormats={INSUREE_EXPORT_TYPES}
              blockName={INSUREES_TYPE}
              formatMessage={formatMessage}
              forms={forms}
              handleFieldChange={handleFieldChange}
              onPopupClose={onPopupClose}
              onRegisterDownload={onRegisterDownload}
              onSubmit={onSubmit}
              openPopup={openPopup}
              popupName="openInsurees"
              popupState={popupState}
              strategies={INSUREES_STRATEGIES}
              blockTitle="insureesBlockTitle"
              downloadLabel="insurees.downloadLabel"
              uploadLabel="insurees.uploadLabel"
              uploadPopupMessage="UploadDialog.confirmInsurees"
            />
          )}
          {hasRights(RIGHT_REGISTERS_ITEMS) && (
            <Grid item xs={4}>
              <Block title={formatMessage("itemsBlockTitle")}>
                <Grid container spacing={2} direction="column">
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("items.downloadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <ConstantBasedPicker
                          module="tools"
                          label="formatPicker"
                          onChange={(value) =>
                            handleFieldChange(ITEMS_TYPE, "format", value)
                          }
                          required
                          constants={EXPORT_TYPES}
                          withNull={false}
                        />
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={onRegisterDownload(
                              ITEMS_TYPE,
                              forms.items?.format
                            )}
                            disabled={!forms.items?.format}
                          >
                            {formatMessage("downloadBtn")}
                          </Button>
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                  <Grid item>
                    <Divider fullWidth />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("items.uploadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <Grid item>
                          <Input
                            onChange={(event) =>
                              handleFieldChange(
                                ITEMS_TYPE,
                                "file",
                                event.target.files[0]
                              )
                            }
                            required
                            id="import-button"
                            inputProps={{
                              accept:
                                ".xml, application/xml, text/xml, .csv, text/csv, .xls, application/vnd.ms-excel, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .json, application/json",
                            }}
                            type="file"
                          />
                        </Grid>
                        // The strategy picker + the dry run box are useless when uploading all formats other than XML. The code should be refactored to display them/take them into account only if the provided file is an XML file. /
                        <Grid item>
                          <ConstantBasedPicker
                            module="tools"
                            label="strategyPicker"
                            onChange={(value) =>
                              handleFieldChange(ITEMS_TYPE, "strategy", value)
                            }
                            required
                            constants={MEDICAL_ITEMS_STRATEGIES}
                            withNull={false}
                          />
                        </Grid>
                        <Grid item>
                          <FormControlLabel
                            label={formatMessage("dryRunLabel")}
                            control={
                              <Checkbox
                                checked={forms.items?.dryRun}
                                onChange={(e) =>
                                  handleFieldChange(
                                    ITEMS_TYPE,
                                    "dryRun",
                                    e.target.checked
                                  )
                                }
                              />
                            }
                          />
                        </Grid>
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => openPopup(e, ITEMS_TYPE)}
                            disabled={
                              !(forms.items?.file && forms.items?.strategy)
                            }
                          >
                            {formatMessage("uploadBtn")}
                          </Button>
                          {popupState?.open && popupState?.openItems && (
                            <Dialog
                              open
                              onClose={onPopupClose}
                              fullWidth
                              maxWidth="sm"
                            >
                              <DialogTitle>
                                {formatMessage("UploadDialog.confirmItems")}
                              </DialogTitle>
                              <DialogActions>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() =>
                                    onSubmit(forms.items, ITEMS_TYPE)
                                  }
                                  disabled={
                                    !(
                                      forms.items?.file && forms.items?.strategy
                                    )
                                  }
                                >
                                  {formatMessage("uploadBtn")}
                                </Button>
                                <Button
                                  onClick={onPopupClose}
                                  variant="contained"
                                >
                                  {formatMessage("cancelBtn")}
                                </Button>
                              </DialogActions>
                            </Dialog>
                          )}
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                </Grid>
              </Block>
            </Grid>
          )}

          {hasRights(RIGHT_REGISTERS_SERVICES) && (
            <Grid item xs={4}>
              <Block title={formatMessage("servicesBlockTitle")}>
                <Grid container spacing={2} direction="column">
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("services.downloadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <ConstantBasedPicker
                          module="tools"
                          label="formatPicker"
                          onChange={(value) =>
                            handleFieldChange(SERVICES_TYPE, "format", value)
                          }
                          required
                          constants={EXPORT_TYPES}
                          withNull={false}
                        />
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={onRegisterDownload(
                              SERVICES_TYPE,
                              forms.services?.format
                            )}
                            disabled={!forms.services?.format}
                          >
                            {formatMessage("downloadBtn")}
                          </Button>
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                  <Grid item>
                    <Divider fullWidth />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {formatMessage("services.uploadLabel")}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <form noValidate>
                      <Grid container spacing={1} direction="column">
                        <Grid item>
                          <Input
                            onChange={(event) =>
                              handleFieldChange(
                                SERVICES_TYPE,
                                "file",
                                event.target.files[0]
                              )
                            }
                            required
                            id="import-button"
                            inputProps={{
                              accept:
                                ".xml, application/xml, text/xml, .csv, text/csv, .xls, application/vnd.ms-excel, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .json, application/json",
                            }}
                            type="file"
                          />
                        </Grid>
                        // The strategy picker + the dry run box are useless when uploading all formats other than XML. The code should be refactored to display them/take them into account only if the provided file is an XML file.
                        <Grid item>
                          <ConstantBasedPicker
                            module="tools"
                            label="strategyPicker"
                            onChange={(value) =>
                              handleFieldChange(
                                SERVICES_TYPE,
                                "strategy",
                                value
                              )
                            }
                            required
                            constants={MEDICAL_SERVICES_STRATEGIES}
                            withNull={false}
                          />
                        </Grid>
                        <Grid item>
                          <FormControlLabel
                            label={formatMessage("dryRunLabel")}
                            control={
                              <Checkbox
                                checked={forms.services?.dryRun}
                                onChange={(e) =>
                                  handleFieldChange(
                                    SERVICES_TYPE,
                                    "dryRun",
                                    e.target.checked
                                  )
                                }
                              />
                            }
                          />
                        </Grid>
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => openPopup(e, SERVICES_TYPE)}
                            disabled={
                              !(
                                forms.services?.file && forms.services?.strategy
                              )
                            }
                          >
                            {formatMessage("uploadBtn")}
                          </Button>
                          {popupState?.open && popupState?.openServices && (
                            <Dialog
                              open
                              onClose={onPopupClose}
                              fullWidth
                              maxWidth="sm"
                            >
                              <DialogTitle>
                                {formatMessage("UploadDialog.confirmServices")}
                              </DialogTitle>
                              <DialogActions>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() =>
                                    onSubmit(forms.services, SERVICES_TYPE)
                                  }
                                  disabled={
                                    !(
                                      forms.services?.file &&
                                      forms.services?.strategy
                                    )
                                  }
                                >
                                  {formatMessage("uploadBtn")}
                                </Button>
                                <Button
                                  onClick={onPopupClose}
                                  variant="contained"
                                >
                                  {formatMessage("cancelBtn")}
                                </Button>
                              </DialogActions>
                            </Dialog>
                          )}
                        </Grid>
                      </Grid>
                    </form>
                  </Grid>
                </Grid>
              </Block>
            </Grid>
          )}*/}
        </Grid>
      </Box>
    </>
  );
};

export default RegistersPage;
