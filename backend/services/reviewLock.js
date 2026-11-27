// Serialize decisions for the same student in this API process. Two parallel
// approvals must see each other's schedule before a second course is accepted.
const pending = new Map();
module.exports = async function reviewLock(req, res, next) {
  const key = req.params.studentId;
  const previous = pending.get(key) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  pending.set(key, current);
  await previous;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    release();
    if (pending.get(key) === current) pending.delete(key);
  };
  res.once('finish', finish);
  res.once('close', finish);
  if (res.destroyed) return finish();
  next();
};
