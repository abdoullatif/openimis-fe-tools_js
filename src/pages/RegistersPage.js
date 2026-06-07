import React, { useState } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";

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
  formatMessage,
  ConstantBasedPicker,
  baseApiUrl,
  ProgressOrError,
  apiHeaders,
} from "@openimis/fe-core";
import Block from "../components/Block";
import SereImportBlock from "../components/SereImportBlock";
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
  USERS_TYPE,
  HF_TYPE,
  ITEMS_TYPE,
  SERVICES_TYPE,
} from "../constants";
import UsersImportBlock from "../components/UsersImportBlock";
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
const USERS_STRATEGIES = [
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

/** API may return right ids as strings; constants are numbers. */
function normalizeRightsIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    if (typeof r === "string") {
      const n = parseInt(r, 10);
      return Number.isNaN(n) ? r : n;
    }
    return r;
  });
}

const RegistersPage = ({ intl, rights }) => {
  const formatPageMessage = (id) => formatMessage(intl, "tools.RegistersPage", id);
  const [forms, setForms] = useState({});
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
          formatPageMessage(
            `An error occurred. Please contact your administrator. ${error?.message}`
          ),
      });
    }
  };
  return (
    <>
      {dialogState?.open && (
        <Dialog open onClose={onDialogClose} fullWidth maxWidth="sm">
          <DialogTitle>{formatPageMessage("UploadDialog.title")}</DialogTitle>
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
                    ? formatPageMessage("UploadDialog.success")
                    : formatPageMessage("UploadDialog.failure")}
                </Box>
                {"sent" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.sent")}</b>
                    {dialogState.data.sent}
                  </Box>
                )}
                {"created" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.created")}</b>
                    {dialogState.data.created}
                  </Box>
                )}
                {"updated" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.updated")}</b>
                    {dialogState.data.updated}
                  </Box>
                )}
                {"deleted" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.deleted")}</b>
                    {dialogState.data.deleted}
                  </Box>
                )}
                {"skipped" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.skipped")}</b>
                    {dialogState.data.skipped}
                  </Box>
                )}
                {"invalid" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.invalid")}</b>
                    {dialogState.data.invalid}
                  </Box>
                )}
                {"failed" in dialogState.data && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.failed")}</b>
                    {dialogState.data.failed}
                  </Box>
                )}
                {dialogState.uploadErrors?.length > 0 && (
                  <Box my={1}>
                    <b>{formatPageMessage("UploadDialog.errors")}</b>
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
              {formatPageMessage("UploadDialog.okButton")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Box fullWidth m={2}>
        <Grid container spacing={2}>
          <UsersImportBlock
            formatMessage={formatPageMessage}
            REGISTERS_URL={REGISTERS_URL}
            onSubmit={onSubmit}
            USERS_TYPE={USERS_TYPE}
            USERS_STRATEGIES={USERS_STRATEGIES}
            handleFieldChange={handleFieldChange}
          />
          <SereImportBlock formatMessage={formatPageMessage} />
          {hasRights(RIGHT_REGISTERS_LOCATIONS) && (
            <Grid item xs={4}>
              <Block title={formatPageMessage("locationsBlockTitle")}>
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
                      {formatPageMessage("downloadBtn")}
                    </Button>
                  </Grid>
                  <Grid item>
                    <Divider fullWidth />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {formatPageMessage("locations.uploadLabel")}
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
                            label={formatPageMessage("dryRunLabel")}
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
                            {formatPageMessage("uploadBtn")}
                          </Button>
                          {popupState?.open && popupState?.openLocations && (
                            <Dialog
                              open
                              onClose={onPopupClose}
                              fullWidth
                              maxWidth="sm"
                            >
                              <DialogTitle>
                                {formatPageMessage("UploadDialog.confirmLocations")}
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
                                  {formatPageMessage("uploadBtn")}
                                </Button>
                                <Button
                                  onClick={onPopupClose}
                                  variant="contained"
                                >
                                  {formatPageMessage("cancelBtn")}
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
        </Grid>
      </Box>
    </>
  );
};

const mapStateToProps = (state) => ({
  rights: normalizeRightsIds(state.core?.user?.i_user?.rights ?? []),
});

export default connect(mapStateToProps)(injectIntl(RegistersPage));
