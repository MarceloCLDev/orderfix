import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {OrderFix} from './OrderFix.js';

export default async () => {
  render(<OrderFix />, document.body);
};