import { useGraphqlMutation, useGraphqlQuery, baseApiUrl, apiHeaders } from "@openimis/fe-core";

export const useReportsQuery = (config) => {
  const { isLoading, error, data, refetch } = useGraphqlQuery(
    `
    query useReportsQuery {
      reports {
        name
        module
        description
      }
    }`,
    {},
    config
  );
  return { isLoading, error, refetch, data };
};

export const useReportQuery = ({ name }, config) => {
  const { isLoading, error, data, refetch } = useGraphqlQuery(
    `
  query useReportQuery ($name: String!) {
    report(
      name: $name) {
        name
        module
        description
        definition
        defaultReport
      }
    }`,
    { name },
    config
  );

  return { isLoading, error, refetch, report: data?.report };
};

export const useOverrideReportMutation = () => {
  const mutation = useGraphqlMutation(
    `
    mutation useOverrideReportMutation($input: OverrideReportMutationInput!) {
      overrideReport(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { onSuccess: (data) => data?.overrideReport }
  );

  return mutation;
};
