(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const swal = () => window.Swal;
  const toast = (icon, title) => swal()?.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 3000, timerProgressBar: true });

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf,
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Request failed.");
    return response;
  };

  const formatMetric = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    return String(Math.round(value));
  };

  const animateCounter = (element, value) => {
    const duration = 1500;
    const start = performance.now();
    const target = Number(value || 0);
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatMetric(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  let metricsNotified = false;
  const loadMetrics = async () => {
    const grids = [...document.querySelectorAll("[data-metrics-grid]")];
    if (!grids.length) return;
    let metrics = null;
    const serverMetrics = grids.find((grid) => grid.dataset.serverMetrics)?.dataset.serverMetrics;
    if (serverMetrics) metrics = JSON.parse(serverMetrics);
    if (!metrics) metrics = await (await fetch("/api/metrics")).json();
    grids.forEach((grid) => {
      grid.querySelectorAll("[data-metric]").forEach((element) => animateCounter(element, metrics[element.dataset.metric] || 0));
    });
    if (!metricsNotified) {
      metricsNotified = true;
      toast("success", "Metrics loaded");
    }
  };
  loadMetrics().catch(() => toast("error", "Metrics could not load."));
  if (document.querySelector("[data-metrics-grid]")) setInterval(loadMetrics, 30000);

  const guidedForm = document.querySelector("#guidedPlanForm");
  if (guidedForm) {
    const steps = [...guidedForm.querySelectorAll(".wizard-step")];
    const dots = [...document.querySelectorAll("[data-step-dot]")];
    const textareas = [...guidedForm.querySelectorAll("textarea[data-min-words]")];
    const progressBar = document.querySelector("#progressBar");
    const progressValue = document.querySelector("#progressValue");
    const projectId = guidedForm.dataset.projectId;
    let current = 0;

    const show = (index) => {
      current = Math.max(0, Math.min(index, steps.length - 1));
      steps.forEach((step, i) => step.classList.toggle("active", i === current));
      dots.forEach((dot, i) => dot.classList.toggle("active", i <= current));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const payload = () => Object.fromEntries(new FormData(guidedForm).entries());
    const countWords = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).length;
    const updateWordCount = (textarea) => {
      const words = countWords(textarea.value);
      const minWords = Number(textarea.dataset.minWords || 0);
      const maxWords = Number(textarea.dataset.maxWords || 0);
      const row = guidedForm.querySelector(`[data-word-count-for="${textarea.name}"]`);
      if (!row) return words;
      row.classList.toggle("valid", words >= minWords && (!maxWords || words <= maxWords));
      row.classList.toggle("over", Boolean(maxWords && words > maxWords));
      const label = row.querySelector("span");
      const message = row.querySelector("strong");
      if (label) label.textContent = `${words} word${words === 1 ? "" : "s"}`;
      if (message) {
        if (words < minWords) message.textContent = `${minWords - words} more word${minWords - words === 1 ? "" : "s"} needed`;
        else if (maxWords && words > maxWords) message.textContent = `${words - maxWords} word${words - maxWords === 1 ? "" : "s"} over the recommended maximum`;
        else message.textContent = "Minimum met";
      }
      return words;
    };
    const validateStep = (step) => {
      const textarea = step.querySelector("textarea[data-min-words]");
      if (!textarea) return true;
      const words = updateWordCount(textarea);
      const minWords = Number(textarea.dataset.minWords || 0);
      if (words >= minWords) return true;
      swal()?.fire("More detail needed", `${textarea.dataset.sectionTitle} needs at least ${minWords} words before you continue. You currently have ${words}.`, "warning");
      textarea.focus();
      return false;
    };
    const validateAllSteps = () => {
      const invalidStep = steps.find((step) => !validateStep(step));
      if (!invalidStep) return true;
      show(Number(invalidStep.dataset.stepIndex || 0));
      return false;
    };
    const updateProgress = (value) => {
      if (progressBar) progressBar.style.width = `${value}%`;
      if (progressValue) progressValue.textContent = `${value}% complete`;
    };
    const save = async (button, { silent = false } = {}) => {
      if (button) button.disabled = true;
      try {
        const result = await (await request(`/api/project/${projectId}/save`, { method: "POST", body: JSON.stringify(payload()) })).json();
        updateProgress(result.progressPercent);
        if (!silent) toast("success", "Progress saved");
        return true;
      } catch (error) {
        toast("error", error.message);
        return false;
      } finally {
        if (button) button.disabled = false;
      }
    };
    textareas.forEach((textarea) => {
      updateWordCount(textarea);
      textarea.addEventListener("input", () => updateWordCount(textarea));
    });
    guidedForm.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", async () => {
      const saved = await save(button, { silent: true });
      if (!saved) return;
      if (!validateStep(steps[current])) return;
      show(current + 1);
      toast("success", "Step saved");
    }));
    guidedForm.querySelectorAll("[data-prev]").forEach((button) => button.addEventListener("click", () => show(current - 1)));
    guidedForm.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", () => save(button)));
    guidedForm.querySelector("[data-submit-project]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const saved = await save(button, { silent: true });
      if (!saved) return;
      if (!validateAllSteps()) return;
      button.disabled = true;
      swal()?.fire({ title: "Correcting grammar and spelling", text: "Please wait while AI reviews your draft.", allowOutsideClick: false, didOpen: () => swal().showLoading() });
      try {
        const result = await (await request(`/api/project/${projectId}/submit`, { method: "POST", body: JSON.stringify(payload()) })).json();
        await swal()?.fire("Project saved", "Your free corrected business plan is ready.", "success");
        location.assign(result.redirect);
      } catch (error) {
        swal()?.fire("Could not submit", error.message, "error");
        button.disabled = false;
      }
    });
  }

  document.querySelectorAll("[data-delete-project]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = await swal()?.fire({ title: "Delete project?", text: "This removes the project from your dashboard.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
      if (!confirmed?.isConfirmed) return;
      try {
        await request(`/api/project/${button.dataset.deleteProject}`, { method: "DELETE", body: "{}" });
        button.closest("[data-project-row]")?.remove();
        document.dispatchEvent(new CustomEvent("projects:changed"));
        toast("success", "Project deleted");
      } catch (error) {
        swal()?.fire("Delete failed", error.message, "error");
      }
    });
  });

  const projectList = document.querySelector("[data-project-list]");
  if (projectList) {
    const rows = [...projectList.querySelectorAll("[data-project-row]")];
    const pageSizeSelect = document.querySelector("[data-project-page-size]");
    const prevButton = document.querySelector("[data-project-prev]");
    const nextButton = document.querySelector("[data-project-next]");
    const pageStatus = document.querySelector("[data-project-page-status]");
    const projectCount = document.querySelector("[data-project-count]");
    let currentPage = 1;

    const visibleRows = () => rows.filter((row) => row.isConnected);
    const renderProjects = () => {
      const activeRows = visibleRows();
      const pageSize = Number(pageSizeSelect?.value || 10);
      const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;

      activeRows.forEach((row, index) => {
        row.hidden = index < start || index >= end;
      });
      if (projectCount) projectCount.textContent = `${activeRows.length} project${activeRows.length === 1 ? "" : "s"}`;
      if (pageStatus) pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
      if (prevButton) prevButton.disabled = currentPage <= 1;
      if (nextButton) nextButton.disabled = currentPage >= totalPages;
    };

    pageSizeSelect?.addEventListener("change", () => {
      currentPage = 1;
      renderProjects();
    });
    prevButton?.addEventListener("click", () => {
      currentPage -= 1;
      renderProjects();
    });
    nextButton?.addEventListener("click", () => {
      currentPage += 1;
      renderProjects();
    });
    document.addEventListener("projects:changed", renderProjects);
    renderProjects();
  }

  document.querySelector("#paymentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const confirmed = await swal()?.fire({
      title: "Manual mobile money confirmation",
      html: `Send <strong>${form.dataset.currency} ${form.dataset.amount}</strong> to <strong>${form.dataset.merchant}</strong>, then click confirm.`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "I have paid"
    });
    if (!confirmed?.isConfirmed) return;
    try {
      const result = await (await request(`/api/project/${form.dataset.projectId}/payment`, { method: "POST", body: JSON.stringify(data) })).json();
      await swal()?.fire("Payment confirmed", "You can now generate the enhanced plan.", "success");
      location.assign(result.redirect);
    } catch (error) {
      swal()?.fire("Payment failed", error.message, "error");
    }
  });

  document.querySelector("[data-enhance-project]")?.addEventListener("click", async (event) => {
    const id = event.currentTarget.dataset.enhanceProject;
    swal()?.fire({ title: "Generating enhanced plan", text: "Expanding each section into a detailed investor-ready business plan. This can take a few minutes.", allowOutsideClick: false, didOpen: () => swal().showLoading() });
    try {
      const result = await (await request(`/api/project/${id}/enhance`, { method: "POST", body: "{}" })).json();
      await swal()?.fire("Enhanced", "Your enhanced business plan is ready.", "success");
      location.assign(result.redirect);
    } catch (error) {
      swal()?.fire("Enhancement failed", error.message, "error");
    }
  });

})();
