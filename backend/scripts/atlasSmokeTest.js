require("dotenv").config();

const mongoose = require("mongoose");
const { app, sessionStore } = require("../server");
const { connectDatabase } = require("../config/database");
const { User } = require("../models/userModel");
const { Project } = require("../models/planModel");
const { Payment } = require("../models/paymentModel");
const { GUIDED_FIELDS } = require("../config/guidedSections");
const { ensureAdminUser } = require("../services/adminBootstrap");

const suffix = String(Date.now()).slice(-7);
const mobileNumber = `097${suffix}`;
const email = `atlas-smoke-${suffix}@example.com`;
const password = "AtlasSmokeTest@2026";

function assert(condition, message) { if (!condition) throw new Error(message); }
function cookieFrom(response) { return response.headers.get("set-cookie")?.split(";")[0] || ""; }
function csrfFrom(html) { return html.match(/name="_csrf" value="([^"]+)"/)?.[1] || html.match(/name="csrf-token" content="([^"]+)"/)?.[1]; }
async function getPage(baseUrl, url, cookie = "") {
  const response = await fetch(`${baseUrl}${url}`, { headers: cookie ? { Cookie: cookie } : {} });
  return { response, html: await response.text() };
}
async function post(baseUrl, url, cookie, csrf, body, contentType = "application/json") {
  return fetch(`${baseUrl}${url}`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": contentType, "x-csrf-token": csrf, Cookie: cookie },
    body: contentType === "application/json" ? JSON.stringify(body) : new URLSearchParams({ _csrf: csrf, ...body })
  });
}

async function run() {
  await connectDatabase();
  await ensureAdminUser();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let user;
  let project;
  try {
    const home = await getPage(baseUrl, "/");
    assert(home.response.status === 200 && home.html.includes("data-metrics-grid") && !home.html.includes("Sponsor"), "Landing metrics page failed.");
    const metrics = await (await fetch(`${baseUrl}/api/metrics`)).json();
    assert(Number.isFinite(metrics.totalPlans) && Number.isFinite(metrics.activeUsers), "Metrics API failed.");

    const register = await getPage(baseUrl, "/register");
    const anonymousCookie = cookieFrom(register.response);
    const registerCsrf = csrfFrom(register.html);
    assert(register.response.status === 200 && anonymousCookie && registerCsrf, "Register page setup failed.");

    const registration = await post(baseUrl, "/register", anonymousCookie, registerCsrf, { fullName: "Atlas Smoke Owner", mobileNumber, email, password }, "application/x-www-form-urlencoded");
    const portalCookie = cookieFrom(registration);
    assert(registration.status === 302 && portalCookie, "Passport registration failed.");

    user = await User.findOne({ mobileNumber }).lean().exec();
    assert(user?.fullName === "Atlas Smoke Owner" && user.email === email, "User was not persisted with required fields.");

    const dashboard = await getPage(baseUrl, "/dashboard", portalCookie);
    const csrf = csrfFrom(dashboard.html);
    assert(dashboard.response.status === 200 && dashboard.html.includes("Your Projects") && dashboard.html.includes("data-metrics-grid"), "Dashboard failed.");

    const newProject = await fetch(`${baseUrl}/project/new`, { redirect: "manual", headers: { Cookie: portalCookie } });
    assert(newProject.status === 302, "Project creation redirect failed.");
    const editUrl = newProject.headers.get("location");
    project = await Project.findOne({ userId: user._id }).sort({ updatedAt: -1 }).exec();
    assert(project && editUrl === `/project/${project.id}/edit`, "Project was not created.");

    const draft = Object.fromEntries(GUIDED_FIELDS.map((field) => [field, `${field} smoke test content.`]));
    draft.projectName = "Atlas Smoke Business Plan";
    const save = await post(baseUrl, `/api/project/${project.id}/save`, portalCookie, csrf, draft);
    assert(save.status === 200, "Project save failed.");

    const submit = await post(baseUrl, `/api/project/${project.id}/submit`, portalCookie, csrf, draft);
    assert(submit.status === 200, "Project submit failed.");
    project = await Project.findById(project.id).exec();
    assert(project.status === "submitted" && project.sections.executiveSummary, "Submitted project was not persisted.");

    const payment = await post(baseUrl, `/api/project/${project.id}/payment`, portalCookie, csrf, { provider: "MTN Mobile Money", phone: mobileNumber });
    assert(payment.status === 200, "Mobile-money payment confirmation failed.");
    project = await Project.findById(project.id).exec();
    assert(project.premiumUnlocked, "Payment did not unlock enhancement.");
    assert(await Payment.exists({ planId: project.id, status: "received" }), "Payment audit record missing.");

    const projectJson = await getPage(baseUrl, `/api/project/${project.id}`, portalCookie);
    assert(projectJson.response.status === 200 && projectJson.html.includes("Atlas Smoke Business Plan"), "Project JSON endpoint failed.");

    const deleteResponse = await fetch(`${baseUrl}/api/project/${project.id}`, { method: "DELETE", headers: { "x-csrf-token": csrf, Cookie: portalCookie } });
    assert(deleteResponse.status === 200, "Project delete failed.");
    project = null;

    console.log("Atlas smoke test passed: metrics, Passport registration, dashboard, project save/submit, payment confirmation, JSON fetch, delete, and admin seed.");
  } finally {
    if (project) await Project.deleteOne({ _id: project._id });
    if (user) {
      await Payment.deleteMany({ userId: user._id });
      await Project.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
      await mongoose.connection.collection("sessions").deleteMany({ session: { $regex: String(user._id) } });
    }
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await sessionStore.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
