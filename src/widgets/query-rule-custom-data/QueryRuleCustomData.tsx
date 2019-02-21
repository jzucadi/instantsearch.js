import React from 'preact-compat';
import Template from '../../components/Template/Template';

type QueryRuleCustomDataProps = {
  templateProps: object;
  items: any;
};

const QueryRuleCustomData = ({
  templateProps,
  items,
}: QueryRuleCustomDataProps) => (
  <Template {...templateProps} templateKey="default" data={items} />
);

export default QueryRuleCustomData;
