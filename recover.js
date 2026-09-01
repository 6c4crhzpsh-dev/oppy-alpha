import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://pabnncvorvyrwgcxgqiu.supabase.co",
  "sb_publishable_f2wQ78XtQ5OO657Y7Lfvsg_nk_o27Ep",
  { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } }
);

const A = document.querySelector("#app");
const msg = document.querySelector("#msg");
const btn = document.querySelector("#continue");
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const params = new URLSearchParams(location.search);
const tokenHash = params.get("token_hash");
const type = params.get("type") || "recovery";

if (!tokenHash || type !== "recovery") {
  btn.disabled = true;
  msg.innerHTML = '<div class="notice">Dieser Link ist unvollständig. Bitte fordere eine neue Passwort-Mail an.</div>';
}

btn.onclick = async () => {
  btn.disabled = true;
  msg.innerHTML = '<div class="notice">Sicherheitslink wird geprüft …</div>';

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (error || !data?.session) {
    msg.innerHTML = `<div class="notice">${esc(error?.message || "Der Link ist abgelaufen oder wurde bereits verwendet.")}</div>`;
    btn.disabled = false;
    return;
  }

  history.replaceState({}, "", "/recover.html");
  A.innerHTML = `<span class="kicker">OPPY Konto</span><h1>Neues Passwort setzen</h1>
    <div class="card"><input id="newpassword" type="password" autocomplete="new-password" placeholder="Neues Passwort (mind. 10 Zeichen)">
    <div class="row"><button class="primary" id="savepw">Passwort speichern</button></div><div id="pwmsg"></div></div>`;

  const pw = document.querySelector("#newpassword");
  const pwmsg = document.querySelector("#pwmsg");
  document.querySelector("#savepw").onclick = async () => {
    if (pw.value.length < 10) {
      pwmsg.innerHTML = '<div class="notice">Bitte mindestens 10 Zeichen verwenden.</div>';
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: pw.value });
    if (updateError) {
      pwmsg.innerHTML = `<div class="notice">${esc(updateError.message)}</div>`;
      return;
    }
    pwmsg.innerHTML = '<div class="notice ok">Passwort geändert. Du wirst zu OPPY weitergeleitet.</div>';
    setTimeout(() => { location.href = "/"; }, 900);
  };
};
