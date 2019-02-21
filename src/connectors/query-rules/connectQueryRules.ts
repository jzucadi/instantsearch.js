import noop from 'lodash/noop';
import isEqual from 'lodash/isEqual';
import { Renderer, RenderOptions } from '../../types/connector';
import { WidgetFactory } from '../../types/widget';
import {
  Helper,
  SearchResults,
  FacetRefinement,
} from '../../types/instantsearch';
import {
  checkRendering,
  createDocumentationMessageGenerator,
  warning,
} from '../../lib/utils';

const withUsage = createDocumentationMessageGenerator({
  name: 'query-rules',
  connector: true,
});

type TrackedFilters = {
  [facetName: string]: (facetValues: string[]) => string[];
};

export type QueryRulesConnectorParams = {
  trackedFilters?: TrackedFilters;
  transformRuleContexts?: (ruleContexts: string[]) => string[];
  transformItems?: (items: object[]) => any;
};

export type QueryRulesWidgetParams = {
  trackedFilters?: TrackedFilters;
  transformRuleContexts?: (ruleContexts: string[]) => string[];
  transformItems?: (items: object[]) => any;
};

export interface QueryRulesRenderOptions<T> extends RenderOptions<T> {
  userData: object[];
  results: SearchResults;
}

export type QueryRulesRenderer<T> = Renderer<QueryRulesRenderOptions<T>>;

export type QueryRulesWidgetFactory<T> = WidgetFactory<
  QueryRulesConnectorParams & T
>;

export type QueryRulesConnector = {
  <T>(
    render: QueryRulesRenderer<T>,
    unmount?: () => void
  ): QueryRulesWidgetFactory<T>;
};

// A context rule must consist only of alphanumeric characters, hyphens, and underscores.
// See https://www.algolia.com/doc/guides/managing-results/refine-results/merchandising-and-promoting/in-depth/implementing-query-rules/#context
function escapeRuleContext(ruleName: string) {
  return ruleName.replace(/[^a-zA-Z0-9-_]+/gi, '_');
}

function getRuleContextsFromTrackedFilters({
  helper,
  trackedFilters,
}: {
  helper: Helper;
  trackedFilters: TrackedFilters;
}) {
  const ruleContexts = Object.keys(trackedFilters).reduce(
    (facets: string[], facetName) => {
      const getFacetValues = trackedFilters[facetName];
      const facetRefinements: string[] = helper
        .getRefinements(facetName)
        .map((refinement: FacetRefinement) => refinement.value);
      const facetValues: string[] = getFacetValues(facetRefinements);

      return [
        ...facets,
        ...facetRefinements
          .filter(
            facetRefinement =>
              facetValues.findIndex(
                facetValue => facetValue === facetRefinement
              ) !== -1
          )
          .map(facetValue =>
            escapeRuleContext(`ais-${facetName}-${facetValue}`)
          ),
      ];
    },
    []
  );

  return ruleContexts;
}

function reconcileRuleContexts({
  initialRuleContexts,
  newRuleContexts,
  transformRuleContexts,
}) {
  const allRuleContexts = [...initialRuleContexts, ...newRuleContexts];

  warning(
    allRuleContexts.length <= 10,
    `
The maximum number of \`ruleContexts\` is 10. They have been sliced to that limit.
Consider using \`transformRuleContexts\` to minimize the number of rules sent to Algolia.
`
  );

  const ruleContexts = transformRuleContexts(allRuleContexts).slice(0, 10);

  return ruleContexts;
}

function applyRuleContexts({ helper, ruleContexts }) {
  const previousRuleContexts = helper.getQueryParameter('ruleContexts');

  if (!isEqual(previousRuleContexts, ruleContexts)) {
    helper.setQueryParameter('ruleContexts', ruleContexts).search();
  }
}

const connectQueryRules: QueryRulesConnector = (render, unmount = noop) => {
  checkRendering(render, withUsage());

  let initialRuleContexts: string[] = [];
  let addedRuleContexts: string[] = [];

  return widgetParams => {
    const {
      trackedFilters = {},
      transformRuleContexts = (rules: string[]) => rules,
      transformItems = (items: object[]) => items,
    } = widgetParams || {};

    Object.keys(trackedFilters).forEach(facetName => {
      if (typeof trackedFilters[facetName] !== 'function') {
        throw new Error(
          withUsage(
            `'The "${facetName}" filter value in the \`trackedFilters\` option expects a function.`
          )
        );
      }
    });

    return {
      init({ helper, state, instantSearchInstance }) {
        if (Object.keys(trackedFilters).length > 0) {
          initialRuleContexts = state.ruleContexts || [];

          // The helper's method `getQueryParameter` doesn't work on unset attributes.
          // We need to set `ruleContexts` to a default value before retrieving it.
          if (initialRuleContexts.length === 0) {
            helper.setQueryParameter('ruleContexts', initialRuleContexts);
          }

          const newRuleContexts = getRuleContextsFromTrackedFilters({
            helper,
            trackedFilters,
          });
          addedRuleContexts = newRuleContexts;
          const ruleContexts = reconcileRuleContexts({
            initialRuleContexts,
            newRuleContexts,
            transformRuleContexts,
          });

          applyRuleContexts({
            helper,
            ruleContexts,
          });
        }

        render(
          {
            userData: [],
            results: {},
            instantSearchInstance,
            widgetParams,
          },
          true
        );
      },

      render({ helper, results, instantSearchInstance }) {
        const { userData: rawUserData = [] } = results;
        const userData = transformItems(rawUserData);

        if (Object.keys(trackedFilters).length > 0) {
          const newRuleContexts = getRuleContextsFromTrackedFilters({
            helper,
            trackedFilters,
          });
          addedRuleContexts = newRuleContexts;
          const ruleContexts = reconcileRuleContexts({
            initialRuleContexts,
            newRuleContexts,
            transformRuleContexts,
          });

          applyRuleContexts({
            helper,
            ruleContexts,
          });
        }

        render(
          {
            userData,
            results,
            instantSearchInstance,
            widgetParams,
          },
          false
        );
      },

      dispose({ helper }) {
        if (Object.keys(trackedFilters).length > 0) {
          const reinitRuleContexts = helper
            .getQueryParameter('ruleContexts')
            .filter((rule: string) => !addedRuleContexts.includes(rule));

          helper.setQueryParameter('ruleContexts', reinitRuleContexts).search();
        }

        unmount();
      },
    };
  };
};

export default connectQueryRules;
