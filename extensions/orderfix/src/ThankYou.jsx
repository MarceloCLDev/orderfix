import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {OrderFixThankYou} from './OrderFix.js';

export default async () => {
  render(<OrderFixThankYou />, document.body);
};