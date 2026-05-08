const { execSync } = require('child_process');

const privateKey = '"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC89AIF1Gr4nhko\\nQmSX/d8rfPBYc9Ypm7tc+p9qKAzWFVuEpCJnk81pHWuUxLGrOS+ib+Z35DODv4xW\\nGAiKeW6X9usmc/0NhaxMlvVqWWvKK/eyGHZT/2XIiNBhwuGV9CfZ3+/3tSlws31F\\n2Sh7/7E8QlmnYrbj4BW9SrZQxo1zeQOjhdJHFihvDVcUycOQ/yE0fPCzAXHnIdnK\\nGTH1gUjSyDaRsZ72SiQvowNgYtmuZCfY0wCeT+3CTVzZ4FNtya9phTMVAYKzHV1a\\nTucGYsJFxXYeTtg/jrdLJmGMLxRYKPaSsOjd/T5GmSn+EnhCgF69Hi3MGcJfU6jX\\niANkOihBAgMBAAECggEAUHD/FXVHrx07b5DIW46ofk6b0cRK1f7nJp/J0ztGr7N6\\n+T6ZKQha6Beuz7BnRRI87cX+02ay6bFX8OUdabpls0ta881oW2PfpOGVjFeSVIkg\\nU9EnOv5dWiCouh3pxNmjR5WXBxk4kbLQL7bSDewei51hpqmXW+7vwlz2ve+xk4kj\\nUUZPf3ogamRqFR1MfpUIhsNZBMpANW82YPng5Hd+iPgWbP9ttukxEWJaUWTL/N/b\\ngutmZPIflxxsPtflFfR2hkmRibWqRVpSC0MfShnb4Py/6xaxCSObvpTArtk55lQI\\n3VXHV+HAx0eho0v5Kv9l9aw115sIcQpoCLWnuUP6MwKBgQDoMjT1oltENtKJx8+y\\nKvQsip+GclFbSmmR4KikQIRnHyN/BiKE5tUpX59XgvwmW4Eer+eD2gjRe6iE1tik\\nMO3tq2lAGGIsIc6BGPy0zNqllDJ3afE9iC9iN92GwqIbLyhXhU46GqpckDPgay63\\n79E9v9fwvv4GPvWmjIb1bZy0vwKBgQDQUuzxdJN5hJzF7+bq8y30W6eHkSilDhHU\\ntYRRn5MBKXbDtjxqF8Z3cAwROPh5ZhBvgyq5Kc6SWfWY9IYi7+ktF5ahSpKon9Y\\nLstW38MeortRP521JKfJlWgMfWeDHgnRY9u6c3gElWIXK0ZUAvGyfkHCvnUZTqLJ\\nnEmtz09i/wKBgQCqw7HbLIo+gqsYFVEUUS6+SzzDHfPjVbiKRlUAZ0p4pJfwZUyh\\nvTnrcZ24OGbEtusg7HExsPpnRbBL8c3mAu4YqsV/E++vUTWUEBJZzYbH21O6Krn2\\nbN+cNkW/RAkAQRBEPY+of8/mv07Hr0vujnquFRb0wSIE6eyzjgn7GZ/z9QKBgFiS\\naVtfjTQlReKCVVOfgPJb5aal+Pn0OXCE987wgdIgR8QTU/mq9IQy2/upzpnE3C9X\\ndltSTCdj/loQpsr438pPRa6G36xL2ojLnHibOoJT/gBVY+AYbZ4vf8WPq+r7YoE8\\nS7fCUEzilonzRDuD5O9W7u61u2O/I0dEw666ba5RAoGAXhVLegZASJUS9fCIgnyQ\\nnOcjUO1o4T/SiTIoGSSF+P4S8wIiFR2V/7Mtn/42KvNaoFVxRvSkvNNcBZagVBwb\\nQab8pyXiUBRpdvumc3u40Feg3oUOt9PO3YiQlr1TsgL7BT2d8au9jkMRz7HlD/c6\\n9I7l/DNHddjPHqwYHJluRZs=\\n-----END PRIVATE KEY-----\\n"';

try {
  execSync('npx vercel env rm FIREBASE_PRIVATE_KEY production -y', { stdio: 'ignore' });
} catch(e) {}

try {
  const result = execSync('npx vercel env add FIREBASE_PRIVATE_KEY production --yes', {
    input: privateKey,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('Success:', result.toString());
} catch (e) {
  console.error('Error:', e.stderr ? e.stderr.toString() : e.message);
}
