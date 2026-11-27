import test from 'node:test';
import assert from 'node:assert/strict';
import {billingURL} from '../platform/billing-url.js';
test('billing redirects only reach HTTPS provider URLs without embedded credentials or alternate ports',()=>{
 for(const value of ['https://store.lemonsqueezy.com/checkout/buy/fixture','https://lemonsqueezy.com/my-orders'])assert.equal(billingURL(value),value);
 for(const value of ['javascript:alert(1)','//store.lemonsqueezy.com','https://lemonsqueezy.com.attacker.invalid','https://fakelemonsqueezy.com','http://store.lemonsqueezy.com','https://user:password@store.lemonsqueezy.com','https://store.lemonsqueezy.com:8443','invalid',undefined])assert.throws(()=>billingURL(value));
});
