const admin = require('firebase-admin');

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC89AIF1Gr4nhko
QmSX/d8rfPBYc9Ypm7tc+p9qKAzWFVuEpCJnk81pHWuUxLGrOS+ib+Z35DODv4xW
GAiKeW6X9usmc/0NhaxMlvVqWWvKK/eyGHZT/2XIiNBhwuGV9CfZ3+/3tSlws31F
2Sh7/7E8QlmnYrbj4BW9SrZQxo1zeQOjhdJHFihvDVcUycOQ/yE0fPCzAXHnIdnK
GTH1gUjSyDaRsZ72SiQvowNgYtmuZCfY0wCeT+3CTVzZ4FNtya9phTMVAYKzHV1a
TucGYsJFxXYeTtg/jrdLJmGMLxRYKPaSsOjd/T5GmSn+EnhCgF69Hi3MGcJfU6jX
iANkOihBAgMBAAECggEAUHD/FXVHrx07b5DIW46ofk6b0cRK1f7nJp/J0ztGr7N6
+T6ZKQha6Beuz7BnRRI87cX+02ay6bFX8OUdabpls0ta881oW2PfpOGVjFeSVIkg
U9EnOv5dWiCouh3pxNmjR5WXBxk4kbLQL7bSDewei51hpqmXW+7vwlz2ve+xk4kj
UUZPf3ogamRqFR1MfpUIhsNZBMpANW82YPng5Hd+iPgWbP9ttukxEWJaUWTL/N/b
gutmZPIflxxsPtflFfR2hkmRibWqRVpSC0MfShnb4Py/6xaxCSObvpTArtk55lQI
3VXHV+HAx0eho0v5Kv9l9aw115sIcQpoCLWnuUP6MwKBgQDoMjT1oltENtKJx8+y
KvQsip+GclFbSmmR4KikQIRnHyN/BiKE5tUpX59XgvwmW4Eer+eD2gjRe6iE1tik
MO3tq2lAGGIsIc6BGPy0zNqllDJ3afE9iC9iN92GwqIbLyhXhU46GqpckDPgay63
79E9v9fwvv4GPvWmjIb1bZy0vwKBgQDQUuzxdJN5hJzF7+bq8y30W6eHkSilDhHU
tYRRn5MBKXbDtjxqF8Z3cAwROPh5ZhBvgyq5Kc6SWfWY9IYi7+ktF5ahSpKon9Y
LstW38MeortRP521JKfJlWgMfWeDHgnRY9u6c3gElWIXK0ZUAvGyfkHCvnUZTqLJ
nEmtz09i/wKBgQCqw7HbLIo+gqsYFVEUUS6+SzzDHfPjVbiKRlUAZ0p4pJfwZUyh
vTnrcZ24OGbEtusg7HExsPpnRbBL8c3mAu4YqsV/E++vUTWUEBJZzYbH21O6Krn2
bN+cNkW/RAkAQRBEPY+of8/mv07Hr0vujnquFRb0wSIE6eyzjgn7GZ/z9QKBgFiS
aVtfjTQlReKCVVOfgPJb5aal+Pn0OXCE987wgdIgR8QTU/mq9IQy2/upzpnE3C9X
ndltSTCdj/loQpsr438pPRa6G36xL2ojLnHibOoJT/gBVY+AYbZ4vf8WPq+r7YoE8
S7fCUEzilonzRDuD5O9W7u61u2O/I0dEw666ba5RAoGAXhVLegZASJUS9fCIgnyQ
nOcjUO1o4T/SiTIoGSSF+P4S8wIiFR2V/7Mtn/42KvNaoFVxRvSkvNNcBZagVBwb
Qab8pyXiUBRpdvumc3u40Feg3oUOt9PO3YiQlr1TsgL7BT2d8au9jkMRz7HlD/c6
9I7l/DNHddjPHqwYHJluRZs=
-----END PRIVATE KEY-----
`;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'pxx-tech-pro',
      clientEmail: 'firebase-adminsdk-fbsvc@pxx-tech-pro.iam.gserviceaccount.com',
      privateKey: privateKey,
    }),
  });
  console.log("Firebase initialized SUCCESS with manual string!");
} catch (error) {
  console.error("Firebase init FAIL with manual string:", error);
}
