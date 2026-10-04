// ==========================================================================
// منطق تطبيق منصة نواتج التعلم لاختبارات نافس - الصف التاسع
// ETEC National Assessments 2023 - Grade 9 Interactive Application
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // الحالة العامة للتطبيق
  const state = {
    currentTab: "overview",
    activeDomainFilter: "all",
    selectedLessonId: null,
    
    // حالة المحاكي الوطني
    mock: {
      questions: [...APP_DATA.mockExam],
      currentIndex: 0,
      userAnswers: {}, // { questionIndex: optionIndex }
      flagged: new Set(),
      timer: 30 * 60, // 30 دقيقة بالثواني
      timerInterval: null,
      isSubmitted: false,
      score: 0
    },

    // حالة بطاقات المراجعة
    flashcards: {
      domainFilter: "all",
      currentIndex: 0,
      isFlipped: false,
      filteredCards: [...APP_DATA.flashcards]
    },

    // تقدم المستخدم (محفوظ في التخزين المحلي)
    progress: loadProgress()
  };

  // تهيئة عناصر الواجهة
  initTheme();
  setupEventListeners();
  renderProgress();
  renderCognitiveLevelsGuide();
  renderDomainsSummary();
  renderLessonsList();
  renderFlashcards();
  updateMockNavPalette();

  // -------------------------------------------------------------
  // التخزين المحلي والتقدم
  // -------------------------------------------------------------
  function loadProgress() {
    try {
      const saved = localStorage.getItem("nafss_grade9_progress");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("LocalStorage access error:", e);
    }
    return {
      completedLessons: [],
      lessonScores: {},
      mockBestScore: null
    };
  }

  function saveProgress() {
    try {
      localStorage.setItem("nafss_grade9_progress", JSON.stringify(state.progress));
      renderProgress();
    } catch (e) {
      console.warn("Save progress error:", e);
    }
  }

  function renderProgress() {
    const totalLessons = APP_DATA.lessons.length;
    const completed = state.progress.completedLessons.length;
    const percentage = Math.round((completed / totalLessons) * 100);

    const bar = document.getElementById("overall-progress-bar");
    const text = document.getElementById("overall-progress-text");
    if (bar) bar.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}% (${completed} من ${totalLessons} دروس)`;

    const bestScoreElem = document.getElementById("best-mock-score-badge");
    if (bestScoreElem && state.progress.mockBestScore !== null) {
      bestScoreElem.textContent = `أفضل نتيجة في المحاكي: ${state.progress.mockBestScore}%`;
      bestScoreElem.classList.remove("hidden");
    }
  }

  // -------------------------------------------------------------
  // السمة (Dark / Light Mode)
  // -------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem("nafss_theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("nafss_theme", isDark ? "dark" : "light");
  }

  // -------------------------------------------------------------
  // إدارة التبويبات والتنقل
  // -------------------------------------------------------------
  function switchTab(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove("hidden");

    // تحديث أزرار التنقل النشطة
    document.querySelectorAll(".nav-btn").forEach(btn => {
      const btnTab = btn.getAttribute("data-tab");
      if (btnTab === tabId) {
        btn.classList.add("bg-teal-700", "text-white");
        btn.classList.remove("text-teal-100", "hover:bg-teal-800");
      } else {
        btn.classList.remove("bg-teal-700", "text-white");
        btn.classList.add("text-teal-100", "hover:bg-teal-800");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (tabId === "exam" && !state.mock.timerInterval && !state.mock.isSubmitted) {
      startMockTimer();
      renderCurrentMockQuestion();
    }
  }

  // -------------------------------------------------------------
  // عرض المستويات الإدراكية وشرحها
  // -------------------------------------------------------------
  function renderCognitiveLevelsGuide() {
    const container = document.getElementById("cognitive-levels-container");
    if (!container) return;

    container.innerHTML = Object.entries(APP_DATA.cognitiveLevels).map(([key, item]) => `
      <div class="p-5 rounded-2xl border bg-white dark:bg-gray-800 shadow-sm transition hover:shadow-md">
        <div class="flex items-center justify-between mb-3">
          <span class="px-3 py-1 rounded-full text-xs font-bold border ${item.badgeClass}">
            ${item.percentage} من الاختبار
          </span>
          <i class="fa-solid fa-brain text-teal-600 dark:text-teal-400 text-lg"></i>
        </div>
        <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">${item.name}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">${item.desc}</p>
      </div>
    `).join("");
  }

  // -------------------------------------------------------------
  // عرض المجالات الرئيسية الثلاثة
  // -------------------------------------------------------------
  function renderDomainsSummary() {
    const container = document.getElementById("domains-summary-container");
    if (!container) return;

    container.innerHTML = APP_DATA.domains.map(d => {
      const lessonCount = APP_DATA.lessons.filter(l => l.domainId === d.id).length;
      return `
        <div class="group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          <div class="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br ${d.color} opacity-10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
          <div>
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${d.color} text-white flex items-center justify-center text-2xl mb-5 shadow-lg shadow-teal-500/20">
              <i class="fa-solid ${d.icon}"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">${d.title}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">${d.desc}</p>
          </div>
          <div class="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">
              <i class="fa-solid fa-book-open ml-1 text-teal-600"></i> ${lessonCount} موضوعات معيارية
            </span>
            <button class="open-domain-lessons-btn text-teal-600 dark:text-teal-400 font-bold text-sm hover:underline flex items-center gap-1" data-domain="${d.id}">
              استكشف المسار <i class="fa-solid fa-arrow-left text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".open-domain-lessons-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const domain = btn.getAttribute("data-domain");
        state.activeDomainFilter = domain;
        switchTab("lessons");
        updateDomainFilterButtons();
        renderLessonsList();
      });
    });
  }

  // -------------------------------------------------------------
  // عرض قائمة الدروس والفلترة
  // -------------------------------------------------------------
  function renderLessonsList() {
    const container = document.getElementById("lessons-grid-container");
    if (!container) return;

    let filtered = APP_DATA.lessons;
    if (state.activeDomainFilter !== "all") {
      filtered = filtered.filter(l => l.domainId === state.activeDomainFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
          <i class="fa-solid fa-folder-open text-4xl mb-3"></i>
          <p>لا توجد دروس مطابقة لهذا التصنيف.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(lesson => {
      const isCompleted = state.progress.completedLessons.includes(lesson.id);
      const domain = APP_DATA.domains.find(d => d.id === lesson.domainId);
      const score = state.progress.lessonScores[lesson.id];

      return `
        <div class="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                ${lesson.badge}
              </span>
              ${isCompleted ? `
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                  <i class="fa-solid fa-circle-check"></i> مكتمل ${score ? `(${score}%)` : ''}
                </span>
              ` : `
                <span class="text-xs text-gray-400">غير مكتمل</span>
              `}
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-snug">
              ${lesson.title}
            </h3>
            <p class="text-xs text-teal-600 dark:text-teal-400 font-semibold mb-3">
              <i class="fa-solid fa-certificate ml-1"></i> رمز النواتج: ${lesson.outcomesRef}
            </p>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4">
              <p class="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">مؤشرات الأداء المستهدفة:</p>
              <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1 pr-4 list-disc">
                ${lesson.indicators.slice(0, 2).map(ind => `<li>${ind}</li>`).join("")}
                ${lesson.indicators.length > 2 ? `<li class="text-teal-600 dark:text-teal-400 font-semibold">+ ${lesson.indicators.length - 2} مؤشرات أخرى...</li>` : ""}
              </ul>
            </div>
          </div>
          <div class="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
              <i class="fa-solid fa-question-circle text-teal-600 ml-1"></i> ${lesson.questions.length} أسئلة تدريبية
            </span>
            <button class="open-lesson-detail-btn px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-md shadow-teal-600/20 flex items-center gap-1" data-id="${lesson.id}">
              <span>ابدأ الدرس</span>
              <i class="fa-solid fa-angle-left"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".open-lesson-detail-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openLessonView(id);
      });
    });
  }

  function updateDomainFilterButtons() {
    document.querySelectorAll(".domain-filter-btn").forEach(btn => {
      const d = btn.getAttribute("data-filter");
      if (d === state.activeDomainFilter) {
        btn.classList.add("bg-teal-600", "text-white");
        btn.classList.remove("bg-gray-100", "dark:bg-gray-800", "text-gray-700", "dark:text-gray-300");
      } else {
        btn.classList.remove("bg-teal-600", "text-white");
        btn.classList.add("bg-gray-100", "dark:bg-gray-800", "text-gray-700", "dark:text-gray-300");
      }
    });
  }

  // -------------------------------------------------------------
  // عرض الدرس المفصل مع الأسئلة التفاعلية
  // -------------------------------------------------------------
  function openLessonView(lessonId) {
    state.selectedLessonId = lessonId;
    const lesson = APP_DATA.lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const lessonsListContainer = document.getElementById("lessons-list-view");
    const lessonDetailContainer = document.getElementById("lesson-detail-view");

    if (lessonsListContainer) lessonsListContainer.classList.add("hidden");
    if (lessonDetailContainer) lessonDetailContainer.classList.remove("hidden");

    // العنوان والرموز
    document.getElementById("lesson-view-badge").textContent = lesson.badge;
    document.getElementById("lesson-view-title").textContent = lesson.title;
    document.getElementById("lesson-view-code").textContent = `نواتج التعلم (ETEC): ${lesson.outcomesRef}`;

    // مؤشرات الأداء
    const indicatorsBox = document.getElementById("lesson-view-indicators");
    indicatorsBox.innerHTML = lesson.indicators.map(ind => `
      <li class="flex items-start gap-2">
        <i class="fa-solid fa-check-circle text-teal-600 dark:text-teal-400 mt-1 flex-shrink-0"></i>
        <span>${ind}</span>
      </li>
    `).join("");

    // محتوى الشرح بتنسيق HTML المنظم
    const contentBox = document.getElementById("lesson-view-content");
    contentBox.innerHTML = renderMarkdown(lesson.summary);

    // النقاط الذهبية الملخصة
    const keyTakeawaysBox = document.getElementById("lesson-view-takeaways");
    keyTakeawaysBox.innerHTML = lesson.keyTakeaways.map(t => `
      <div class="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-sm text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
        <i class="fa-solid fa-star text-amber-500 mt-0.5"></i>
        <span class="font-medium">${t}</span>
      </div>
    `).join("");

    // أسئلة التدريب الخاصة بالدرس
    renderLessonQuiz(lesson);

    // أزرار التنقل (السابق / التالي)
    setupLessonPagination(lesson);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupLessonPagination(currentLesson) {
    const currentIndex = APP_DATA.lessons.findIndex(l => l.id === currentLesson.id);
    const prevLesson = APP_DATA.lessons[currentIndex - 1];
    const nextLesson = APP_DATA.lessons[currentIndex + 1];

    const prevBtn = document.getElementById("lesson-prev-btn");
    const nextBtn = document.getElementById("lesson-next-btn");

    if (prevLesson) {
      prevBtn.classList.remove("opacity-40", "pointer-events-none");
      prevBtn.onclick = () => openLessonView(prevLesson.id);
      prevBtn.querySelector("span").textContent = `السابق: ${prevLesson.title.substring(0, 20)}...`;
    } else {
      prevBtn.classList.add("opacity-40", "pointer-events-none");
      prevBtn.querySelector("span").textContent = "بداية المسار";
    }

    if (nextLesson) {
      nextBtn.classList.remove("opacity-40", "pointer-events-none");
      nextBtn.onclick = () => openLessonView(nextLesson.id);
      nextBtn.querySelector("span").textContent = `التالي: ${nextLesson.title.substring(0, 20)}...`;
    } else {
      nextBtn.classList.add("opacity-40", "pointer-events-none");
      nextBtn.querySelector("span").textContent = "نهاية المسار";
    }
  }

  function renderLessonQuiz(lesson) {
    const container = document.getElementById("lesson-quiz-container");
    if (!container) return;

    let userAnswers = {};

    function renderQuestions() {
      container.innerHTML = lesson.questions.map((q, qIndex) => {
        const cognitive = APP_DATA.cognitiveLevels[q.level] || { name: q.level, badgeClass: "bg-gray-100" };
        const selected = userAnswers[qIndex];
        const isAnswered = selected !== undefined;

        return `
          <div class="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm mb-6">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold px-3 py-1 rounded-full border ${cognitive.badgeClass}">
                ${cognitive.name}
              </span>
              <span class="text-xs font-semibold text-gray-500">سؤال ${qIndex + 1} من ${lesson.questions.length}</span>
            </div>
            <h4 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 leading-relaxed">
              ${q.text}
            </h4>
            <div class="space-y-2.5">
              ${q.options.map((opt, optIndex) => {
                let optStyle = "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60";
                let icon = `<i class="fa-regular fa-circle text-gray-400"></i>`;

                if (isAnswered) {
                  if (optIndex === q.correct) {
                    optStyle = "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold";
                    icon = `<i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>`;
                  } else if (optIndex === selected) {
                    optStyle = "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold";
                    icon = `<i class="fa-solid fa-circle-xmark text-rose-600 dark:text-rose-400"></i>`;
                  } else {
                    optStyle = "opacity-50 border-gray-200 dark:border-gray-800";
                  }
                }

                return `
                  <button class="lesson-option-btn w-full p-4 rounded-xl border text-right transition flex items-center justify-between gap-3 ${optStyle}" 
                          data-q="${qIndex}" data-opt="${optIndex}" ${isAnswered ? "disabled" : ""}>
                    <span class="text-sm sm:text-base leading-relaxed">${opt}</span>
                    <span class="text-lg">${icon}</span>
                  </button>
                `;
              }).join("")}
            </div>

            ${isAnswered ? `
              <div class="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm leading-relaxed">
                <div class="font-bold mb-1 flex items-center gap-1.5 ${selected === q.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                  <i class="fa-solid ${selected === q.correct ? 'fa-check' : 'fa-info-circle'}"></i>
                  ${selected === q.correct ? 'إجابة صحيحة! أحسنت.' : 'تفسير الإجابة الصحيحة:'}
                </div>
                <p class="text-gray-700 dark:text-gray-300">${q.explanation}</p>
              </div>
            ` : ""}
          </div>
        `;
      }).join("");

      // إضافة تفاعلات الأزرار
      container.querySelectorAll(".lesson-option-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const qIdx = parseInt(btn.getAttribute("data-q"));
          const optIdx = parseInt(btn.getAttribute("data-opt"));
          userAnswers[qIdx] = optIdx;
          renderQuestions();

          // التحقق من اكتمال جميع الأسئلة وحفظ النتيجة
          if (Object.keys(userAnswers).length === lesson.questions.length) {
            let correctCount = 0;
            lesson.questions.forEach((q, idx) => {
              if (userAnswers[idx] === q.correct) correctCount++;
            });
            const scorePercentage = Math.round((correctCount / lesson.questions.length) * 100);
            
            if (!state.progress.completedLessons.includes(lesson.id)) {
              state.progress.completedLessons.push(lesson.id);
            }
            state.progress.lessonScores[lesson.id] = scorePercentage;
            saveProgress();

            if (typeof confetti === "function" && scorePercentage >= 66) {
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
            }
          }
        });
      });
    }

    renderQuestions();
  }

  // -------------------------------------------------------------
  // محاكي الاختبار الوطني الشامل (نافس)
  // -------------------------------------------------------------
  function startMockTimer() {
    if (state.mock.timerInterval) clearInterval(state.mock.timerInterval);

    state.mock.timerInterval = setInterval(() => {
      if (state.mock.timer <= 0) {
        clearInterval(state.mock.timerInterval);
        submitMockExam();
        return;
      }
      state.mock.timer--;
      updateMockTimerDisplay();
    }, 1000);
  }

  function updateMockTimerDisplay() {
    const timerElem = document.getElementById("mock-timer-display");
    if (!timerElem) return;

    const minutes = Math.floor(state.mock.timer / 60);
    const seconds = state.mock.timer % 60;
    timerElem.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    if (state.mock.timer < 300) {
      timerElem.classList.add("text-rose-600", "animate-pulse");
    } else {
      timerElem.classList.remove("text-rose-600", "animate-pulse");
    }
  }

  function renderCurrentMockQuestion() {
    const q = state.mock.questions[state.mock.currentIndex];
    const container = document.getElementById("mock-question-display-container");
    if (!container || !q) return;

    const cognitive = APP_DATA.cognitiveLevels[q.level] || { name: q.level, badgeClass: "bg-gray-100" };
    const domain = APP_DATA.domains.find(d => d.id === q.domainId) || { title: "عام" };
    const selected = state.mock.userAnswers[state.mock.currentIndex];
    const isFlagged = state.mock.flagged.has(state.mock.currentIndex);

    container.innerHTML = `
      <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-2">
            <span class="px-3.5 py-1 rounded-full text-xs font-bold border ${cognitive.badgeClass}">
              ${cognitive.name}
            </span>
            <span class="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              ${domain.title}
            </span>
          </div>
          <button id="flag-question-btn" class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${isFlagged ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}">
            <i class="fa-${isFlagged ? 'solid' : 'regular'} fa-bookmark text-amber-500"></i>
            <span>${isFlagged ? 'السؤال مميز' : 'تمييز للمراجعة'}</span>
          </button>
        </div>

        <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
          <span class="text-teal-600 font-black ml-2">${state.mock.currentIndex + 1}.</span>
          ${q.text}
        </h3>

        <div class="space-y-3 mb-8">
          ${q.options.map((opt, optIndex) => {
            const isChosen = selected === optIndex;
            return `
              <button class="mock-opt-btn w-full p-4 rounded-2xl border text-right transition flex items-center justify-between gap-4 ${isChosen ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-600 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/30 font-bold' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}" data-opt="${optIndex}">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isChosen ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
                    ${['أ', 'ب', 'ج', 'د'][optIndex]}
                  </span>
                  <span class="text-sm sm:text-base leading-relaxed">${opt}</span>
                </div>
                <i class="fa-${isChosen ? 'solid fa-circle-check text-teal-600' : 'regular fa-circle text-gray-300'} text-lg"></i>
              </button>
            `;
          }).join("")}
        </div>

        <div class="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
          <button id="mock-prev-btn" class="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2 ${state.mock.currentIndex === 0 ? 'opacity-40 pointer-events-none' : ''}">
            <i class="fa-solid fa-arrow-right text-xs"></i>
            <span>السابق</span>
          </button>

          <span class="text-xs text-gray-500 font-medium">
            السؤال ${state.mock.currentIndex + 1} من ${state.mock.questions.length}
          </span>

          ${state.mock.currentIndex === state.mock.questions.length - 1 ? `
            <button id="mock-finish-btn" class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition shadow-lg shadow-teal-600/30 flex items-center gap-2">
              <i class="fa-solid fa-check"></i>
              <span>إنهاء وتسليم الاختبار</span>
            </button>
          ` : `
            <button id="mock-next-btn" class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition shadow-md shadow-teal-600/20 flex items-center gap-2">
              <span>التالي</span>
              <i class="fa-solid fa-arrow-left text-xs"></i>
            </button>
          `}
        </div>
      </div>
    `;

    // معالجة اختيار الإجابة
    container.querySelectorAll(".mock-opt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const opt = parseInt(btn.getAttribute("data-opt"));
        state.mock.userAnswers[state.mock.currentIndex] = opt;
        renderCurrentMockQuestion();
        updateMockNavPalette();
      });
    });

    // تمييز السؤال
    const flagBtn = document.getElementById("flag-question-btn");
    if (flagBtn) {
      flagBtn.addEventListener("click", () => {
        if (state.mock.flagged.has(state.mock.currentIndex)) {
          state.mock.flagged.delete(state.mock.currentIndex);
        } else {
          state.mock.flagged.add(state.mock.currentIndex);
        }
        renderCurrentMockQuestion();
        updateMockNavPalette();
      });
    }

    // التنقل السابق / التالي
    const prevBtn = document.getElementById("mock-prev-btn");
    const nextBtn = document.getElementById("mock-next-btn");
    const finishBtn = document.getElementById("mock-finish-btn");

    if (prevBtn) prevBtn.addEventListener("click", () => {
      if (state.mock.currentIndex > 0) {
        state.mock.currentIndex--;
        renderCurrentMockQuestion();
        updateMockNavPalette();
      }
    });

    if (nextBtn) nextBtn.addEventListener("click", () => {
      if (state.mock.currentIndex < state.mock.questions.length - 1) {
        state.mock.currentIndex++;
        renderCurrentMockQuestion();
        updateMockNavPalette();
      }
    });

    if (finishBtn) finishBtn.addEventListener("click", confirmSubmitMock);
  }

  function updateMockNavPalette() {
    const palette = document.getElementById("mock-palette-container");
    if (!palette) return;

    palette.innerHTML = state.mock.questions.map((q, idx) => {
      const isCurrent = idx === state.mock.currentIndex;
      const isAnswered = state.mock.userAnswers[idx] !== undefined;
      const isFlagged = state.mock.flagged.has(idx);

      let btnClass = "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";

      if (isAnswered) {
        btnClass = "bg-teal-600 text-white border-teal-600";
      }

      if (isCurrent) {
        btnClass += " ring-2 ring-teal-400 ring-offset-2 dark:ring-offset-gray-900";
      }

      if (isFlagged) {
        btnClass += " border-2 border-amber-400";
      }

      return `
        <button class="question-nav-btn w-9 h-9 rounded-lg text-xs font-bold border flex items-center justify-center relative transition ${btnClass}" data-index="${idx}">
          ${idx + 1}
          ${isFlagged ? `<span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400"></span>` : ''}
        </button>
      `;
    }).join("");

    palette.querySelectorAll(".question-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        state.mock.currentIndex = idx;
        renderCurrentMockQuestion();
        updateMockNavPalette();
      });
    });

    // تحديث عدادات الإجابة
    const answeredCount = Object.keys(state.mock.userAnswers).length;
    const answeredStat = document.getElementById("mock-answered-stat");
    if (answeredStat) {
      answeredStat.textContent = `${answeredCount} من ${state.mock.questions.length} أسئلة مجابة`;
    }
  }

  function confirmSubmitMock() {
    const unanswered = state.mock.questions.length - Object.keys(state.mock.userAnswers).length;
    if (unanswered > 0) {
      if (!confirm(`لديك ${unanswered} أسئلة لم تقم بالإجابة عليها بعد. هل أنت متأكد من رغبتك في تسليم الاختبار الآن؟`)) {
        return;
      }
    }
    submitMockExam();
  }

  function submitMockExam() {
    if (state.mock.timerInterval) clearInterval(state.mock.timerInterval);
    state.mock.isSubmitted = true;

    let correctTotal = 0;
    const domainBreakdown = {
      "life-sciences": { total: 0, correct: 0, name: "علوم الحياة" },
      "physical-sciences": { total: 0, correct: 0, name: "العلوم الفيزيائية" },
      "earth-space": { total: 0, correct: 0, name: "علوم الأرض والفضاء" }
    };

    const cognitiveBreakdown = {
      knowledge: { total: 0, correct: 0, name: "المعرفة" },
      application: { total: 0, correct: 0, name: "التطبيق" },
      reasoning: { total: 0, correct: 0, name: "الاستدلال" }
    };

    state.mock.questions.forEach((q, idx) => {
      const userAns = state.mock.userAnswers[idx];
      const isCorrect = userAns === q.correct;

      if (isCorrect) correctTotal++;

      if (domainBreakdown[q.domainId]) {
        domainBreakdown[q.domainId].total++;
        if (isCorrect) domainBreakdown[q.domainId].correct++;
      }

      if (cognitiveBreakdown[q.level]) {
        cognitiveBreakdown[q.level].total++;
        if (isCorrect) cognitiveBreakdown[q.level].correct++;
      }
    });

    const scorePercentage = Math.round((correctTotal / state.mock.questions.length) * 100);
    state.mock.score = scorePercentage;

    // حفظ النتيجة الأعلى
    if (state.progress.mockBestScore === null || scorePercentage > state.progress.mockBestScore) {
      state.progress.mockBestScore = scorePercentage;
      saveProgress();
    }

    renderMockResults(scorePercentage, correctTotal, domainBreakdown, cognitiveBreakdown);

    if (typeof confetti === "function" && scorePercentage >= 70) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  }

  function renderMockResults(score, correctCount, domainBreakdown, cognitiveBreakdown) {
    const liveView = document.getElementById("mock-live-testing-view");
    const resultView = document.getElementById("mock-results-view");

    if (liveView) liveView.classList.add("hidden");
    if (resultView) resultView.classList.remove("hidden");

    let levelTitle = "دون الأساسي (يحتاج لمراجعة مركزة)";
    let levelClass = "text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-300";
    if (score >= 85) {
      levelTitle = "متقدم (أداء استثنائي فائق)";
      levelClass = "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300";
    } else if (score >= 70) {
      levelTitle = "متمكن (مستوى ممتاز يتوافق مع المعايير)";
      levelClass = "text-teal-700 bg-teal-50 dark:bg-teal-950/60 border-teal-300";
    } else if (score >= 50) {
      levelTitle = "أساسي (مستوى متوسط يتطلب تعزيزاً)";
      levelClass = "text-amber-700 bg-amber-50 dark:bg-amber-950/60 border-amber-300";
    }

    // بطاقة النتيجة الكلية
    document.getElementById("mock-result-percentage").textContent = `${score}%`;
    document.getElementById("mock-result-correct").textContent = `${correctCount} من ${state.mock.questions.length} أسئلة صحيحة`;
    
    const tierBadge = document.getElementById("mock-result-tier-badge");
    tierBadge.textContent = levelTitle;
    tierBadge.className = `px-4 py-1.5 rounded-full text-sm font-bold border ${levelClass}`;

    // التحليل حسب المجالات
    const domainsContainer = document.getElementById("mock-domains-breakdown-container");
    if (domainsContainer) {
      domainsContainer.innerHTML = Object.entries(domainBreakdown).map(([k, item]) => {
        const pct = item.total ? Math.round((item.correct / item.total) * 100) : 0;
        return `
          <div class="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold text-sm text-gray-900 dark:text-white">${item.name}</span>
              <span class="text-xs font-bold text-teal-600 dark:text-teal-400">${pct}% (${item.correct}/${item.total})</span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
              <div class="bg-teal-600 h-full rounded-full transition-all" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join("");
    }

    // التحليل حسب المستويات الإدراكية
    const cogContainer = document.getElementById("mock-cog-breakdown-container");
    if (cogContainer) {
      cogContainer.innerHTML = Object.entries(cognitiveBreakdown).map(([k, item]) => {
        const pct = item.total ? Math.round((item.correct / item.total) * 100) : 0;
        return `
          <div class="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold text-sm text-gray-900 dark:text-white">${item.name}</span>
              <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">${pct}% (${item.correct}/${item.total})</span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
              <div class="bg-indigo-600 h-full rounded-full transition-all" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join("");
    }

    // مراجعة الأسئلة تفصيلياً مع الإجابات والتبريرات
    const reviewList = document.getElementById("mock-questions-review-list");
    if (reviewList) {
      reviewList.innerHTML = state.mock.questions.map((q, idx) => {
        const userChoice = state.mock.userAnswers[idx];
        const isRight = userChoice === q.correct;
        const cog = APP_DATA.cognitiveLevels[q.level] || { name: q.level, badgeClass: "bg-gray-100" };

        return `
          <div class="p-6 rounded-2xl border ${isRight ? 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800' : 'border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-800'} shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${isRight ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                  ${idx + 1}
                </span>
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${cog.badgeClass}">${cog.name}</span>
              </div>
              <span class="text-xs font-bold ${isRight ? 'text-emerald-600' : 'text-rose-600'}">
                <i class="fa-solid ${isRight ? 'fa-circle-check' : 'fa-circle-xmark'} ml-1"></i>
                ${isRight ? 'إجابتك صحيحة' : 'إجابتك خاطئة'}
              </span>
            </div>
            <h4 class="text-base font-bold text-gray-900 dark:text-white mb-3 leading-relaxed">${q.text}</h4>
            <div class="space-y-2 mb-3">
              ${q.options.map((opt, optIdx) => {
                let badge = "";
                let style = "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400";
                if (optIdx === q.correct) {
                  style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold";
                  badge = `<span class="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">الإجابة النموذجية</span>`;
                } else if (optIdx === userChoice && !isRight) {
                  style = "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-bold";
                  badge = `<span class="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full">إجابتك</span>`;
                }
                return `
                  <div class="p-3 rounded-xl border text-sm flex items-center justify-between ${style}">
                    <span>${opt}</span>
                    ${badge}
                  </div>
                `;
              }).join("")}
            </div>
            <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-600">
              <span class="font-bold text-teal-700 dark:text-teal-300">التفسير العلمي: </span>
              ${q.explanation}
            </div>
          </div>
        `;
      }).join("");
    }
  }

  function resetMockExam() {
    state.mock.currentIndex = 0;
    state.mock.userAnswers = {};
    state.mock.flagged.clear();
    state.mock.timer = 30 * 60;
    state.mock.isSubmitted = false;

    const liveView = document.getElementById("mock-live-testing-view");
    const resultView = document.getElementById("mock-results-view");

    if (resultView) resultView.classList.add("hidden");
    if (liveView) liveView.classList.remove("hidden");

    startMockTimer();
    renderCurrentMockQuestion();
    updateMockNavPalette();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -------------------------------------------------------------
  // بطاقات المراجعة السريعة (Flashcards)
  // -------------------------------------------------------------
  function renderFlashcards() {
    let filtered = APP_DATA.flashcards;
    if (state.flashcards.domainFilter !== "all") {
      filtered = filtered.filter(fc => fc.domain === state.flashcards.domainFilter);
    }
    state.flashcards.filteredCards = filtered;
    if (state.flashcards.currentIndex >= filtered.length) {
      state.flashcards.currentIndex = 0;
    }

    const card = state.flashcards.filteredCards[state.flashcards.currentIndex];
    const flipCardElem = document.getElementById("main-flashcard");
    const frontText = document.getElementById("flashcard-front-text");
    const backText = document.getElementById("flashcard-back-text");
    const counter = document.getElementById("flashcard-counter-text");
    const domainBadge = document.getElementById("flashcard-domain-badge");

    if (!card || !flipCardElem) return;

    flipCardElem.classList.remove("flipped");
    state.flashcards.isFlipped = false;

    frontText.textContent = card.front;
    backText.textContent = card.back;
    counter.textContent = `بطاقة ${state.flashcards.currentIndex + 1} من ${filtered.length}`;

    const domainObj = APP_DATA.domains.find(d => d.id === card.domain);
    if (domainBadge) {
      domainBadge.textContent = domainObj ? domainObj.title : "عام";
    }
  }

  // -------------------------------------------------------------
  // معالج تحويل نصوص Markdown المبسطة إلى HTML
  // -------------------------------------------------------------
  function renderMarkdown(md) {
    if (!md) return "";
    let html = md;

    // عناوين
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-teal-700 dark:text-teal-300 flex items-center gap-2"><i class="fa-solid fa-bookmark text-teal-500 text-sm"></i>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-r-4 border-teal-600 pr-3">$1</h2>');

    // خطوط وفواصل
    html = html.replace(/^\-\-\-$/gim, '<hr class="my-6 border-dashed border-gray-200 dark:border-gray-700" />');

    // كتل المعادلات (LaTeX KaTeX مبسط)
    html = html.replace(/\$\$(.*?)\$\$/gs, '<div class="my-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 text-center font-mono text-base text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800/50 overflow-x-auto" dir="ltr">$1</div>');
    html = html.replace(/\$(.*?)\$/g, '<code class="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-sm" dir="ltr">$1</code>');

    // نصوص عريضة
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-teal-800 dark:text-teal-300">$1</strong>');

    // تحويل الجداول
    html = html.replace(/\|(.+)\|/g, function (match) {
      const rows = match.trim().split("\n");
      let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full text-right border-collapse text-sm">';
      let isHeader = true;

      rows.forEach((row, idx) => {
        if (row.includes("---")) {
          isHeader = false;
          return;
        }
        const cols = row.split("|").filter((c, i, a) => i > 0 && i < a.length - 1);
        if (cols.length === 0) return;

        tableHtml += '<tr class="' + (isHeader ? 'bg-teal-50 dark:bg-teal-950 font-bold' : 'border-b border-gray-100 dark:border-gray-700') + '">';
        cols.forEach(col => {
          tableHtml += isHeader 
            ? `<th class="p-3 border-b-2 border-teal-500">${col.trim()}</th>` 
            : `<td class="p-3">${col.trim()}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</table></div>';
      return tableHtml;
    });

    // القوائم النقطية
    html = html.replace(/^\* (.*$)/gim, '<li class="flex items-start gap-2 mb-2"><i class="fa-solid fa-circle text-teal-500 text-[8px] mt-2 flex-shrink-0"></i><span>$1</span></li>');

    return html;
  }

  // -------------------------------------------------------------
  // إعداد مستمعات الأحداث (Event Listeners)
  // -------------------------------------------------------------
  function setupEventListeners() {
    // التبديل بين التبويبات
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        switchTab(tab);
      });
    });

    // تبديل السمة
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

    // الرجوع لقائمة الدروس من عرض الدرس المفصل
    const backBtn = document.getElementById("back-to-lessons-list-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        document.getElementById("lesson-detail-view").classList.add("hidden");
        document.getElementById("lessons-list-view").classList.remove("hidden");
        renderLessonsList();
      });
    }

    // فلترة الدروس حسب المجال
    document.querySelectorAll(".domain-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeDomainFilter = btn.getAttribute("data-filter");
        updateDomainFilterButtons();
        renderLessonsList();
      });
    });

    // أزرار بطاقات المراجعة (Flashcards)
    const flashcardElem = document.getElementById("main-flashcard");
    if (flashcardElem) {
      flashcardElem.addEventListener("click", () => {
        flashcardElem.classList.toggle("flipped");
        state.flashcards.isFlipped = !state.flashcards.isFlipped;
      });
    }

    const prevFcBtn = document.getElementById("prev-flashcard-btn");
    const nextFcBtn = document.getElementById("next-flashcard-btn");
    const shuffleFcBtn = document.getElementById("shuffle-flashcard-btn");

    if (prevFcBtn) prevFcBtn.addEventListener("click", () => {
      if (state.flashcards.currentIndex > 0) {
        state.flashcards.currentIndex--;
      } else {
        state.flashcards.currentIndex = state.flashcards.filteredCards.length - 1;
      }
      renderFlashcards();
    });

    if (nextFcBtn) nextFcBtn.addEventListener("click", () => {
      if (state.flashcards.currentIndex < state.flashcards.filteredCards.length - 1) {
        state.flashcards.currentIndex++;
      } else {
        state.flashcards.currentIndex = 0;
      }
      renderFlashcards();
    });

    if (shuffleFcBtn) shuffleFcBtn.addEventListener("click", () => {
      state.flashcards.filteredCards.sort(() => Math.random() - 0.5);
      state.flashcards.currentIndex = 0;
      renderFlashcards();
    });

    // فلترة البطاقات
    document.querySelectorAll(".fc-domain-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".fc-domain-filter-btn").forEach(b => {
          b.classList.remove("bg-teal-600", "text-white");
          b.classList.add("bg-gray-100", "dark:bg-gray-800", "text-gray-700", "dark:text-gray-300");
        });
        btn.classList.add("bg-teal-600", "text-white");
        btn.classList.remove("bg-gray-100", "dark:bg-gray-800", "text-gray-700", "dark:text-gray-300");

        state.flashcards.domainFilter = btn.getAttribute("data-domain");
        state.flashcards.currentIndex = 0;
        renderFlashcards();
      });
    });

    // إعادة الاختبار في شاشة النتائج
    const restartMockBtn = document.getElementById("restart-mock-btn");
    if (restartMockBtn) restartMockBtn.addEventListener("click", resetMockExam);

    // البحث السريع
    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length === 0) {
          renderLessonsList();
          return;
        }

        switchTab("lessons");
        const filtered = APP_DATA.lessons.filter(l => 
          l.title.toLowerCase().includes(query) ||
          l.summary.toLowerCase().includes(query) ||
          l.indicators.some(ind => ind.toLowerCase().includes(query)) ||
          l.outcomesRef.toLowerCase().includes(query)
        );

        const container = document.getElementById("lessons-grid-container");
        if (container) {
          if (filtered.length === 0) {
            container.innerHTML = `
              <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fa-solid fa-magnifying-glass text-4xl mb-3"></i>
                <p>لم يتم العثور على نتائج تطابق: "${query}"</p>
              </div>
            `;
          } else {
            // استخدام دالة الرسم مع المجموعة المفلترة
            container.innerHTML = filtered.map(lesson => `
              <div class="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 mb-3 inline-block">
                    ${lesson.badge}
                  </span>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">${lesson.title}</h3>
                  <p class="text-xs text-teal-600 dark:text-teal-400 mb-3 font-semibold">${lesson.outcomesRef}</p>
                </div>
                <button class="open-lesson-detail-btn w-full mt-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs" data-id="${lesson.id}">
                  عرض الشرح والأسئلة
                </button>
              </div>
            `).join("");

            container.querySelectorAll(".open-lesson-detail-btn").forEach(btn => {
              btn.addEventListener("click", () => openLessonView(btn.getAttribute("data-id")));
            });
          }
        }
      });
    }

    // زر الطباعة
    const printBtn = document.getElementById("print-lesson-btn");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
  }
});
