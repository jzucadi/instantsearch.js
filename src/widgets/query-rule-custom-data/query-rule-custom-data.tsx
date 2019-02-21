import React, { render, unmountComponentAtNode } from 'preact-compat';
import {
  getContainerNode,
  prepareTemplateProps,
  createDocumentationMessageGenerator,
} from '../../lib/utils';
import { WidgetFactory } from '../../types/widget';
import connectQueryRules, {
  QueryRulesRenderer,
} from '../../connectors/query-rules/connectQueryRules';
import CustomData from './QueryRuleCustomData';

type QueryRuleCustomDataTemplates = {
  default: string | ((options: object) => string);
};

type QueryRuleCustomDataWidgetParams = {
  container: string | HTMLElement;
  templates?: QueryRuleCustomDataTemplates;
  transformItems?: (items: object[]) => any;
};

interface QueryRuleCustomDataConnectorWidgetParams
  extends QueryRuleCustomDataWidgetParams {
  container: HTMLElement;
}

type QueryRuleCustomData = WidgetFactory<QueryRuleCustomDataWidgetParams>;

const withUsage = createDocumentationMessageGenerator({
  name: 'query-rules-custom-data',
});

const renderer: QueryRulesRenderer<
  QueryRuleCustomDataConnectorWidgetParams
> = ({ userData, instantSearchInstance, widgetParams }) => {
  const { container, templates } = widgetParams;

  const templateProps = prepareTemplateProps({
    templates,
    templatesConfig: instantSearchInstance.templatesConfig,
  });

  render(
    <CustomData templateProps={templateProps} items={userData} />,
    container
  );
};

const queryRuleCustomData: QueryRuleCustomData = ({
  container,
  templates: userTemplates = {},
  transformItems = items => items,
}) => {
  if (!container) {
    throw new Error(withUsage('The `container` option is required.'));
  }

  const defaultTemplates = { default: '' };
  const templates = {
    ...defaultTemplates,
    ...userTemplates,
  };

  const containerNode = getContainerNode(container);
  const makeContextualHits = connectQueryRules(renderer, () => {
    unmountComponentAtNode(containerNode);
  });

  return makeContextualHits({
    container: containerNode,
    templates,
    transformItems,
  });
};

export default queryRuleCustomData;
