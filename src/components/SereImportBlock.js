import React, { Component } from "react";
import {
  Grid,
  Button,
  Divider,
  Typography,
  Input,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Tooltip,
  IconButton,
} from "@material-ui/core";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import { Alert } from "@material-ui/lab";
import { baseApiUrl, ProgressOrError, apiHeaders, ConstantBasedPicker } from "@openimis/fe-core";
import Block from "./Block";

const IMPORT_URL = `${baseApiUrl}/productive_inclusion/import/`;
const RESET_URL = `${baseApiUrl}/productive_inclusion/reset/`;
const TEMPLATE_URL = `${baseApiUrl}/productive_inclusion/import_template/`;
const TEMPLATE_URL_ALT = `${baseApiUrl}/productive_inclusion/import_template`;

const STRATEGY_OPTIONS = [
  "INSERT",
  "UPDATE",
  "INSERT_AND_UPDATE",
];

function parseFilenameFromContentDisposition(disposition) {
  if (!disposition) return null;
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
  const raw = match?.[1] || match?.[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.trim());
  } catch (_) {
    return raw.trim();
  }
}

function triggerBlobDownload(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function isExcelFile(file) {
  if (!file) return false;
  const fileName = file.name?.toLowerCase() ?? "";
  const fileType = file.type ?? "";
  return (
    fileName.endsWith(".xlsx")
    || fileName.endsWith(".xls")
    || fileType.includes("application/vnd.ms-excel")
    || fileType.includes(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
  );
}

function pickNumber(payload, ...keys) {
  for (const k of keys) {
    if (payload[k] !== undefined && payload[k] !== null && payload[k] !== "") {
      const n = Number(payload[k]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function normalizeWarnings(payload) {
  const w = payload.warnings;
  if (!Array.isArray(w)) return [];
  return w.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
}

const EMPTY_IMPORT_COUNTERS = {
  groupsCreated: null,
  groupsUpdated: null,
  groupsUnchanged: null,
  groupsSkipped: null,
  groupsTouchedCount: null,
  memberRowsInserted: null,
  memberRowsUpdated: null,
  memberRowsUnchanged: null,
  memberRowsSkipped: null,
  membersSoftDeleted: null,
  activityRowsInserted: null,
  activityRowsUpdated: null,
  activityRowsUnchanged: null,
  activityRowsSkipped: null,
  presencesCreated: null,
  presencesDeletedImport: null,
  presencesUnchanged: null,
  membersStatusUpdated: null,
  membersStatusUnchanged: null,
  beneficiariesSuspended: null,
  beneficiariesReactivated: null,
  beneficiariesUnmatched: null,
};

/** Compteurs alignés sur la réponse REST productive_inclusion/import (snake_case + camelCase). */
function parseImportCounters(payload) {
  return {
    groupsCreated: pickNumber(
      payload,
      "groups_created",
      "groupsCreated",
      "groups_count",
      "groupsCount",
    ),
    groupsUpdated: pickNumber(payload, "groups_updated", "groupsUpdated"),
    groupsUnchanged: pickNumber(payload, "groups_unchanged", "groupsUnchanged"),
    groupsSkipped: pickNumber(payload, "groups_skipped", "groupsSkipped"),
    groupsTouchedCount: pickNumber(
      payload,
      "groups_touched_count",
      "groupsTouchedCount",
    ),
    memberRowsInserted: pickNumber(
      payload,
      "member_rows_inserted",
      "memberRowsInserted",
      "members_count",
      "membersCount",
    ),
    memberRowsUpdated: pickNumber(
      payload,
      "member_rows_updated",
      "memberRowsUpdated",
    ),
    memberRowsUnchanged: pickNumber(
      payload,
      "member_rows_unchanged",
      "memberRowsUnchanged",
    ),
    memberRowsSkipped: pickNumber(
      payload,
      "member_rows_skipped",
      "memberRowsSkipped",
    ),
    membersSoftDeleted: pickNumber(
      payload,
      "members_soft_deleted",
      "membersSoftDeleted",
    ),
    activityRowsInserted: pickNumber(
      payload,
      "activity_rows_inserted",
      "activityRowsInserted",
      "activities_inserted",
      "activitiesInserted",
    ),
    activityRowsUpdated: pickNumber(
      payload,
      "activity_rows_updated",
      "activityRowsUpdated",
    ),
    activityRowsUnchanged: pickNumber(
      payload,
      "activity_rows_unchanged",
      "activityRowsUnchanged",
    ),
    activityRowsSkipped: pickNumber(
      payload,
      "activity_rows_skipped",
      "activityRowsSkipped",
    ),
    presencesCreated: pickNumber(
      payload,
      "presences_created",
      "presencesCreated",
    ),
    presencesDeletedImport: pickNumber(
      payload,
      "presences_deleted",
      "presencesDeleted",
    ),
    presencesUnchanged: pickNumber(
      payload,
      "presences_unchanged",
      "presencesUnchanged",
    ),
    membersStatusUpdated: pickNumber(
      payload,
      "members_status_updated",
      "membersStatusUpdated",
    ),
    membersStatusUnchanged: pickNumber(
      payload,
      "members_status_unchanged",
      "membersStatusUnchanged",
    ),
    beneficiariesSuspended: pickNumber(
      payload,
      "beneficiaries_suspended",
      "beneficiariesSuspended",
    ),
    beneficiariesReactivated: pickNumber(
      payload,
      "beneficiaries_reactivated",
      "beneficiariesReactivated",
    ),
    beneficiariesUnmatched: pickNumber(
      payload,
      "beneficiaries_unmatched",
      "beneficiariesUnmatched",
    ),
  };
}

class SereImportBlock extends Component {
  fileInputRef = React.createRef();

  state = {
    file: null,
    loading: false,
    templateDownloadLoading: false,
    strategy: null,
    dryRun: false,
    dialogState: { open: false },
    inlineError: null,
    resetConfirmOpen: false,
    resetLoading: false,
  };

  translate = (id) => this.props.formatMessage(`sereImport.${id}`);

  closeDialog = () => {
    this.setState({ dialogState: { open: false } });
  };

  openResetConfirm = () => {
    this.setState({ resetConfirmOpen: true, inlineError: null });
  };

  closeResetConfirm = () => {
    if (this.state.resetLoading) return;
    this.setState({ resetConfirmOpen: false });
  };

  clearFormFields = () => {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = "";
    }
    this.setState({
      file: null,
      strategy: null,
      dryRun: false,
      inlineError: null,
    });
  };

  onConfirmReset = async () => {
    this.setState({ resetLoading: true, inlineError: null });

    try {
      const headers = { ...(apiHeaders || {}) };
      delete headers["Content-Type"];
      delete headers["content-type"];

      const response = await fetch(RESET_URL, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          ...headers,
          Accept: "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 403) {
        this.setState({
          resetLoading: false,
          resetConfirmOpen: false,
          inlineError: this.translate("resetForbidden"),
        });
        return;
      }

      if (!response.ok || payload.success === false) {
        const message =
          payload.error
          || payload.detail
          || this.translate("resetFailed");
        this.setState({
          resetLoading: false,
          resetConfirmOpen: false,
          inlineError: typeof message === "string" ? message : JSON.stringify(message),
        });
        return;
      }

      this.clearFormFields();
      this.setState({
        resetLoading: false,
        resetConfirmOpen: false,
        dialogState: {
          open: true,
          isLoading: false,
          success: true,
          dryRun: false,
          strategy: null,
          ...EMPTY_IMPORT_COUNTERS,
          groupsDeleted: pickNumber(payload, "groups_deleted", "groupsDeleted") ?? 0,
          membersDeleted: pickNumber(payload, "members_deleted", "membersDeleted") ?? 0,
          activitiesDeleted: pickNumber(payload, "activities_deleted", "activitiesDeleted") ?? 0,
          presencesDeleted: pickNumber(payload, "presences_deleted", "presencesDeleted") ?? 0,
          isResetResult: true,
          warnings: [],
          errors: null,
          generalError: null,
        },
      });
    } catch (error) {
      this.setState({
        resetLoading: false,
        resetConfirmOpen: false,
        inlineError: error?.message || this.translate("resetFailed"),
      });
    }
  };

  onDownloadTemplate = async () => {
    this.setState({ inlineError: null, templateDownloadLoading: true });

    const tryFetch = async (url) =>
      fetch(url, {
        method: "GET",
        headers: {
          ...(apiHeaders || {}),
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
            + "application/vnd.ms-excel,application/octet-stream;q=0.9,*/*;q=0.8",
        },
        credentials: "same-origin",
      });

    try {
      let response = await tryFetch(TEMPLATE_URL);
      if (response.status === 404) {
        response = await tryFetch(TEMPLATE_URL_ALT);
      }

      if (!response.ok) {
        let message = this.translate("templateDownloadFailed");
        const ct = response.headers.get("Content-Type") || "";
        if (ct.includes("application/json")) {
          const body = await response.json().catch(() => ({}));
          if (body.detail || body.error) message = body.detail || body.error;
        }
        this.setState({ templateDownloadLoading: false, inlineError: message });
        return;
      }

      const blob = await response.blob();
      const disposition =
        response.headers.get("Content-Disposition")
        || response.headers.get("content-disposition");
      const fromHeader = parseFilenameFromContentDisposition(disposition);
      const filename =
        fromHeader
        || (blob.type?.includes("spreadsheetml")
          ? "sere_import_template.xlsx"
          : "sere_import_template.xls");

      triggerBlobDownload(blob, filename);
      this.setState({ templateDownloadLoading: false });
    } catch (error) {
      this.setState({
        templateDownloadLoading: false,
        inlineError:
          error?.message || this.translate("templateDownloadFailed"),
      });
    }
  };

  onFileChange = (event) => {
    this.setState({ file: event.target.files[0] });
  };

  onImport = async () => {
    const { file, strategy, dryRun } = this.state;
    this.setState({ inlineError: null });

    if (strategy == null || strategy === "") {
      this.setState({
        inlineError: this.translate("strategyRequired"),
      });
      return;
    }

    if (!isExcelFile(file)) {
      this.setState({
        inlineError: this.translate("invalidFormat"),
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("strategy", strategy);
    if (dryRun) {
      formData.append("dry_run", "true");
    }

    this.setState({
      loading: true,
      dialogState: {
        open: true,
        isLoading: true,
        success: null,
        dryRun: null,
        strategy: null,
        ...EMPTY_IMPORT_COUNTERS,
        warnings: [],
        errors: null,
        generalError: null,
      },
    });

    try {
      const headers = { ...(apiHeaders || {}) };
      delete headers["Content-Type"];
      delete headers["content-type"];

      const response = await fetch(IMPORT_URL, {
        body: formData,
        method: "POST",
        credentials: "same-origin",
        headers,
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 403) {
        this.setState({
          loading: false,
          dialogState: {
            open: true,
            isLoading: false,
            success: false,
            dryRun: !!(payload.dry_run ?? payload.dryRun),
            strategy: payload.strategy ?? strategy,
            warnings: normalizeWarnings(payload),
            generalError: this.translate("forbidden"),
          },
        });
        return;
      }

      if (response.status >= 400) {
        this.setState({
          loading: false,
          dialogState: {
            open: true,
            isLoading: false,
            success: false,
            dryRun: !!(payload.dry_run ?? payload.dryRun),
            strategy: payload.strategy ?? strategy,
            warnings: normalizeWarnings(payload),
            generalError:
              payload.error
              || payload.detail
              || `${this.translate("httpError")} (${response.status})`,
            errors: payload.errors,
          },
        });
        return;
      }

      const resDry = !!(payload.dry_run ?? payload.dryRun ?? dryRun);
      this.setState({
        loading: false,
        dialogState: {
          open: true,
          isLoading: false,
          success: payload.success !== false,
          dryRun: resDry,
          strategy: payload.strategy ?? strategy,
          ...parseImportCounters(payload),
          warnings: normalizeWarnings(payload),
          generalError: payload.error || null,
          errors: payload.errors,
        },
      });
    } catch (error) {
      this.setState({
        loading: false,
        dialogState: {
          open: true,
          isLoading: false,
          success: false,
          dryRun: null,
          strategy: null,
          warnings: [],
          generalError:
            error?.message || this.translate("errorGeneric"),
        },
      });
    }
  };

  renderCounterRow = (labelId, value) => {
    if (value === null || value === undefined) return null;
    return (
      <Typography display="block">
        {this.translate(labelId)}
        :
        {" "}
        {value}
      </Typography>
    );
  };

  renderImportSection = (sectionTitleId, rows) => {
    const visible = rows.filter(([, value]) => value !== null && value !== undefined);
    if (visible.length === 0) return null;
    return (
      <Box my={1.5}>
        <Typography variant="subtitle2" gutterBottom>
          {this.translate(sectionTitleId)}
        </Typography>
        {visible.map(([labelId, value]) => (
          <React.Fragment key={labelId}>
            {this.renderCounterRow(labelId, value)}
          </React.Fragment>
        ))}
      </Box>
    );
  };

  renderImportCounters = (dialogState) => (
    <>
      {this.renderImportSection("sectionGroups", [
        ["groupsCreated", dialogState.groupsCreated],
        ["groupsUpdated", dialogState.groupsUpdated],
        ["groupsUnchanged", dialogState.groupsUnchanged],
        ["groupsSkipped", dialogState.groupsSkipped],
        ["groupsTouchedCount", dialogState.groupsTouchedCount],
      ])}
      {this.renderImportSection("sectionMembers", [
        ["memberRowsInserted", dialogState.memberRowsInserted],
        ["memberRowsUpdated", dialogState.memberRowsUpdated],
        ["memberRowsUnchanged", dialogState.memberRowsUnchanged],
        ["memberRowsSkipped", dialogState.memberRowsSkipped],
        ["membersSoftDeleted", dialogState.membersSoftDeleted],
      ])}
      {this.renderImportSection("sectionActivities", [
        ["activityRowsInserted", dialogState.activityRowsInserted],
        ["activityRowsUpdated", dialogState.activityRowsUpdated],
        ["activityRowsUnchanged", dialogState.activityRowsUnchanged],
        ["activityRowsSkipped", dialogState.activityRowsSkipped],
      ])}
      {this.renderImportSection("sectionPresences", [
        ["presencesCreated", dialogState.presencesCreated],
        ["presencesDeletedImport", dialogState.presencesDeletedImport],
        ["presencesUnchanged", dialogState.presencesUnchanged],
      ])}
      {this.renderImportSection("sectionEligibility", [
        ["membersStatusUpdated", dialogState.membersStatusUpdated],
        ["membersStatusUnchanged", dialogState.membersStatusUnchanged],
        ["beneficiariesSuspended", dialogState.beneficiariesSuspended],
        ["beneficiariesReactivated", dialogState.beneficiariesReactivated],
        ["beneficiariesUnmatched", dialogState.beneficiariesUnmatched],
      ])}
    </>
  );

  renderResetCounters = (dialogState) => (
    <Box my={1}>
      <Typography gutterBottom>{this.translate("resetSuccess")}</Typography>
      <ul>
        <li>
          {this.translate("groupsDeleted")}
          :
          {" "}
          {dialogState.groupsDeleted ?? 0}
        </li>
        <li>
          {this.translate("membersDeleted")}
          :
          {" "}
          {dialogState.membersDeleted ?? 0}
        </li>
        <li>
          {this.translate("activitiesDeleted")}
          :
          {" "}
          {dialogState.activitiesDeleted ?? 0}
        </li>
        <li>
          {this.translate("presencesDeleted")}
          :
          {" "}
          {dialogState.presencesDeleted ?? 0}
        </li>
      </ul>
    </Box>
  );

  render() {
    const {
      file,
      loading,
      strategy,
      dryRun,
      templateDownloadLoading,
      dialogState,
      inlineError,
      resetConfirmOpen,
      resetLoading,
    } = this.state;

    return (
      <Grid item xs={4}>
        <Dialog open={resetConfirmOpen} onClose={this.closeResetConfirm} fullWidth maxWidth="sm">
          <DialogTitle>{this.translate("resetConfirmTitle")}</DialogTitle>
          <DialogContent>
            <Alert severity="warning">
              {this.translate("resetConfirmMessage")}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeResetConfirm} disabled={resetLoading}>
              {this.translate("resetCancel")}
            </Button>
            <Button
              onClick={this.onConfirmReset}
              variant="contained"
              color="secondary"
              disabled={resetLoading}
            >
              {resetLoading
                ? this.translate("resetInProgress")
                : this.translate("resetConfirm")}
            </Button>
          </DialogActions>
        </Dialog>
        {dialogState.open && (
          <Dialog open onClose={this.closeDialog} fullWidth maxWidth="md">
            <DialogTitle>
              {dialogState.isResetResult
                ? this.translate("resetConfirmTitle")
                : this.translate("title")}
            </DialogTitle>
            <DialogContent>
              <ProgressOrError progress={dialogState.isLoading} />
              {dialogState.dryRun && !dialogState.isLoading && (
                <Box my={1}>
                  <Alert severity="info">{this.translate("dryRunResultNotice")}</Alert>
                </Box>
              )}
              {dialogState.generalError && (
                <Box my={1}>{dialogState.generalError}</Box>
              )}
              {!dialogState.isLoading && dialogState.success !== null && (
                <Box my={1}>
                  {dialogState.isResetResult ? (
                    this.renderResetCounters(dialogState)
                  ) : (
                    <>
                      <Typography gutterBottom>
                        {dialogState.success
                          ? this.translate("success")
                          : this.translate("failure")}
                      </Typography>
                      {dialogState.strategy && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          {this.translate("strategyUsed")}
                          :
                          {" "}
                          {this.translate(`strategy${dialogState.strategy}`)}
                        </Typography>
                      )}
                      {this.renderImportCounters(dialogState)}
                    </>
                  )}
                  {dialogState.errors?.length > 0 && (
                    <Box my={1}>
                      <Typography color="error">
                        {this.translate("errors")}
                      </Typography>
                      <ul>
                        {dialogState.errors.map((err, index) => (
                          <li key={index}>
                            {typeof err === "string" ? err : JSON.stringify(err)}
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  {dialogState.warnings?.length > 0 && (
                    <Box my={1}>
                      <Typography>{this.translate("warningsTitle")}</Typography>
                      <Box
                        maxHeight={240}
                        overflow="auto"
                        border="1px solid #e0e0e0"
                        borderRadius={4}
                        p={1}
                        mt={0.5}
                      >
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {dialogState.warnings.map((w, index) => (
                            <li key={index}>
                              <Typography variant="body2" component="span">
                                {w}
                              </Typography>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={this.closeDialog}
                variant="contained"
                color="primary"
                disabled={dialogState.isLoading}
              >
                {this.translate("okButton")}
              </Button>
            </DialogActions>
          </Dialog>
        )}
        <Block title={this.translate("title")}>
          <Grid container spacing={2} direction="column">
            <Grid item>
              <Box display="flex" alignItems="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={this.onDownloadTemplate}
                  disabled={templateDownloadLoading}
                >
                  {templateDownloadLoading
                    ? this.translate("downloadingTemplate")
                    : this.translate("downloadTemplate")}
                </Button>
                <Tooltip title={this.translate("localityHelp")}>
                  <IconButton size="small" aria-label="help">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item>
              <Divider />
            </Grid>
            <Grid item>
              <Typography variant="h6">
                {this.translate("uploadLabel")}
              </Typography>
            </Grid>
            <Grid item>
              <Input
                inputRef={this.fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={this.onFileChange}
                required
              />
            </Grid>
            <Grid item>
              <ConstantBasedPicker
                module="tools"
                label="sereImportStrategyPicker"
                onChange={(v) => this.setState({ strategy: v })}
                required
                constants={STRATEGY_OPTIONS}
                withNull={false}
                value={strategy}
              />
            </Grid>
            <Grid item>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={dryRun}
                    onChange={(e) => this.setState({ dryRun: e.target.checked })}
                    color="primary"
                  />
                )}
                label={this.translate("dryRunLabel")}
              />
            </Grid>
            <Grid item>
              <Box display="flex" style={{ gap: 8 }} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={this.onImport}
                  disabled={!file || loading || strategy == null || strategy === ""}
                >
                  {loading
                    ? this.translate("uploading")
                    : this.translate("uploadBtn")}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={this.openResetConfirm}
                  disabled={loading || resetLoading}
                >
                  {this.translate("resetBtn")}
                </Button>
              </Box>
            </Grid>
            {inlineError && (
              <Grid item>
                <Alert severity="error">{inlineError}</Alert>
              </Grid>
            )}
          </Grid>
        </Block>
      </Grid>
    );
  }
}

export default SereImportBlock;
