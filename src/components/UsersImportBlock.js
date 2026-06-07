import React, { useState } from "react";
import {
  Grid,
  Button,
  Divider,
  Typography,
  Input,
  FormControlLabel,
  Checkbox,
  Box,
} from "@material-ui/core";
import {
  ConstantBasedPicker,
} from "@openimis/fe-core";
import { Alert } from "@material-ui/lab";
import Block from "../components/Block";

export default function UsersImportBlock({ formatMessage, REGISTERS_URL, onSubmit, USERS_STRATEGIES, USERS_TYPE }) {
  const [userFile, setUserFile] = useState(null);
  const [forms, setForms] = useState({ users: { dryRun: false } });
  const [userImportLoading, setUserImportLoading] = useState(false);
  const [userImportData, setUserImportData] = useState(null);
  const [userImportError, setUserImportError] = useState(null);

  const handleStrategyChange = (value) => {
    setForms({
      ...forms,
      users: { ...(forms.users ?? {}), strategy: value },
    });
  };

  return (
    <Grid item xs={4}>
      <Block title={formatMessage("usersBlockTitle")}>
        <Grid container spacing={2} direction="column">
          {/* Bouton télécharger modèle CSV */}
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.open(`${REGISTERS_URL}/user_template`, "_blank")}
            >
              {formatMessage("users.downloadTemplate")}
            </Button>
          </Grid>

          <Grid item>
            <Divider fullWidth />
          </Grid>

          {/* Section upload */}
          <Grid item>
            <Typography variant="h6">
              {formatMessage("users.uploadLabel")}
            </Typography>
          </Grid>

          <Grid item>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setUserFile(e.target.files[0])}
              required
            />
          </Grid>

          {/* Sélection stratégie */}
          <Grid item>
            <ConstantBasedPicker
              module="tools"
              label="strategyPicker"
              onChange={handleStrategyChange}
              required
              constants={USERS_STRATEGIES}
              withNull={false}
            />
          </Grid>

          {/* Option Dry Run */}
          <Grid item>
            <FormControlLabel
              control={
                <Checkbox
                  checked={forms?.users?.dryRun ?? false}
                  onChange={(e) =>
                    setForms({
                      ...forms,
                      users: {
                        ...(forms?.users ?? {}),
                        dryRun: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={formatMessage("users.dryRunLabel")}
            />
          </Grid>

          {/* Bouton Import */}
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={() =>
                onSubmit(
                  { file: userFile, dry_run: forms?.users?.dryRun },
                  "user_import"
                )
              }
              disabled={(!userFile && !forms.users?.strategy) || userImportLoading}
            >
              {userImportLoading
                ? formatMessage("users.uploading")
                : formatMessage("users.uploadBtn")}
            </Button>
          </Grid>

          {/* Résultats import */}
          {userImportData && (
            <Grid item>
              <Box my={1}>
                <Typography variant="body1">
                  {formatMessage("users.created")}: {userImportData.created}
                </Typography>
                <Typography variant="body1">
                  {formatMessage("users.updated")}: {userImportData.updated}
                </Typography>
                {userImportData.errors?.length > 0 && (
                  <Box my={1}>
                    <Typography variant="subtitle1" color="error">
                      {formatMessage("users.errors")}
                    </Typography>
                    <ul>
                      {userImportData.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Box>
            </Grid>
          )}

          {/* Gestion erreurs */}
          {userImportError && (
            <Grid item>
              <Alert severity="error">
                {userImportError.message || formatMessage("users.errorGeneric")}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Block>
    </Grid>
  );
}
