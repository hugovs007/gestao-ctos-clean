const { execSync } = require('child_process');

const privateKey = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJF/6NuEFDyWWu\\nhd+uR8akKyOq3Uf+L1EJoU8R1Hwv2mFzbfqOch1JwGrRRyLNOHlKhk1pedCFQxlq\\nPvrvC8FGRCfx7SioaanHNK+Z09Qgwppu3Y4NBkvjOZCr0iSAii0eUDqw1LPrTYcg\\nQ+KX9RysxchwBLWLJCN8EoU/6ZDQEdGgzij4y8v8zRmvLvurfaz18mgy4r27dUmf\\nnS0o2TNNwSy97S46cD380jHSJhrXOT8pyy/3737KDX/FwKwyPig8Otek65iouoMq\\n/HGBK7IV1iDuvZhE2K4o/CdP25QO58HiZbhLZCHgG7DqHkVt/coD7ZMcXl/U8cqy\\n52M3yyMVAgMBAAECggEADNDhaYVObYRKnXCNRKVw6LoSHBvdsHqyArfb2vJMlt0n\\nXEysTQNDUBW6CQvsUSFyA3ijOt9nVXLlDgMlCXKZlwGVfSLk9jTDu/0k2twn9w2H\\n+5xVpwlZcUoUKQsrxeBohzfMQcRQkiS/AaSp7o7RzMYPI+p86nj7ZPcmNGBNmSEI\\nduBzDcIoMwpgHpbysPMrkR3CfmHcmOiohzWfPO+kA9MnuZQ7Ae/6GByPKHCVViZz\\nTruygay+6w90SNrVs11KuJ6C7z2PB5YWIYxruSnDDv/jdANN1Ga7E1I5etVOfPo7\\nxn8NShRpyJ3OnKK33cRpSg46IxW7piC2U4AH8GvfeQKBgQD/zw+M+/flb8b9QMdD\\njJcI0Tdi77nFxX14BZTjZSXS1W2/7GOp7/4iZvasXrmVG1N+Ucburn6FZGoPhLfb\\n5LZaT6cffBkQXhGCokGtmFQxrUBeQAnNgI8JRpWHel7baCNNfkOYvhRI1OjCXhn3\\nj84XlNg2X0fPMtuaOi9iBg7NXQKBgQDJPndJEAOyAwVlek6SijNU1G8K9Cn3QTQG\\nv+qv/tLuAosi2xIdgnuLc9yjf8pARrSdg2NJ1F/CyF8vNGK9kOfjoHgaq56GcapK\\njQRMcmlwVYbK+mmT1jojgoHJ7CXGUUB+VkLlk8vhQUiF7PHXBjVFZedte5czrXMQ\\nesfiB8cZGQKBgQDLDlvzt5cBowa7xQ3nitPhBeIHQO+gE7IS8atMDeBGSXDC5iv+\\nmyiJul2YWeDKgVR3cwaMNCruS9T82Ibxn804Rv4MOf/TRDh2D8I+wCok/LeZmQ+u\\n9puT61mKnxJo63MKcm3J8yg63/abQwMtxhL8GQS/tEZWLLKw6/rsvo5FaQKBgC5E\\n6nAl+nOHNkpqoH4YwEyUuyMtmCh9GVUj8vWcBSsr8omFDNk0EuuxK917mCjHGOfO\\nOZnT9mB2aUwVI06qbmZrkrGvG7eVkq2pVn+tHojxYRhyEqwm6R8Y9nZSkSzTqZxi\\ngOb/4DReKiqAm+nwR3c5QshtTgpXqsjzMdnKKAChAoGBANKo9zp5eMlJSEJNn0Rh\\nmuV9kVREjKumVsn9hHCbOMdJzw8wfLokvzSCmH2blPYSdo7pi2CrmC7ooyu7GvG3\\n592uUqr4OFDxMAxIcBSyW43JfFEZawRwWx1IDUlRpx4/Oa6c/u4WGnkKXevyeqog\\nr7feQXuqmSzSjMTOwpgsRD7g\\n-----END PRIVATE KEY-----\\n"';

try {
  console.log('Removing old key...');
  execSync('npx vercel env rm FIREBASE_PRIVATE_KEY production -y', { stdio: 'ignore' });
} catch(e) {}

try {
  console.log('Adding new key...');
  const result = execSync('npx vercel env add FIREBASE_PRIVATE_KEY production --yes', {
    input: privateKey,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('Success:', result.toString());
} catch (e) {
  console.error('Error:', e.stderr ? e.stderr.toString() : e.message);
}
