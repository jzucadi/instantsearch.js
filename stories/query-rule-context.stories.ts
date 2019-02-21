import { storiesOf } from '@storybook/html';
import { withHits } from '../.storybook/decorators';

storiesOf('QueryRuleContext', module).add(
  'default',
  withHits(
    ({ search, container, instantsearch }) => {
      search.addWidget(
        instantsearch.widgets.queryRuleContext({
          container,
          trackedFilters: {
            brand: () => ['Samsung', 'Apple'],
            rating: values => values,
          },
        })
      );

      search.addWidget(
        instantsearch.widgets.queryRuleCustomData({
          container,
          transformItems: (items: object[]) => items[0],
          templates: {
            default(item: { banner: string; title: string }) {
              if (item.banner) {
                return `
                  <h3>${item.title}</h3>
                  <img src="${item.banner}" alt="">
                `;
              }

              return '';
            },
          },
        })
      );
    },
    {
      appId: 'OMXGUTOEI9',
      apiKey: '8e4800341b12d1a8b7054443cdca0d65',
      indexName: 'test_MERCHANDIZED',
    }
  )
);
