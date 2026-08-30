document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('username-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const hintTags = document.querySelectorAll('.hint-tag');
  const ctaInput = document.querySelector('.cta-input');
  const ctaBtn = document.querySelector('.cta-btn');

  // Cache
  let currentRepos = [];
  let isPrinting = false;

  // Format Numbers
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
  }

  // API fetcher
  async function githubFetch(url) {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("GitHub API rate limit reached. Please try again later.");
      }
      if (response.status === 404) {
        throw new Error("GitHub username not found.");
      }
      throw new Error("Failed to fetch data from GitHub.");
    }
    return response.json();
  }

  // Main Load Function
  async function loadProfile(username) {
    if (!username) return;

    const originalBtnText = analyzeBtn.innerHTML;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="loading-dots">Analyzing</span>';
    if (ctaBtn) {
      ctaBtn.disabled = true;
      ctaBtn.innerHTML = 'Analyzing...';
    }

    try {
      const user = await githubFetch(`https://api.github.com/users/${username}`);
      const repos = await githubFetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
      
      currentRepos = repos;
      updateDashboardUI(user, repos);
      document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = originalBtnText;
      if (ctaBtn) {
        ctaBtn.disabled = false;
        ctaBtn.innerHTML = 'Analyze Now →';
      }
    }
  }

  // Update UI components
  function updateDashboardUI(user, repos) {
    // Avatar & Info
    const avatarImg = document.querySelector('.profile-avatar');
    if (avatarImg) avatarImg.src = user.avatar_url;

    const profileName = document.querySelector('.profile-name');
    if (profileName) profileName.textContent = user.name || user.login;

    const profileHandle = document.querySelector('.profile-handle');
    if (profileHandle) profileHandle.textContent = `@${user.login}`;

    const profileBio = document.querySelector('.profile-bio');
    if (profileBio) profileBio.textContent = user.bio || "This developer has no bio yet.";

    // Badge
    const verifiedBadge = document.querySelector('.profile-badge.verified');
    if (verifiedBadge) {
      if (user.followers >= 100 || user.public_repos >= 30) {
        verifiedBadge.style.display = 'inline-block';
        verifiedBadge.textContent = '✓ Verified Developer';
      } else {
        verifiedBadge.style.display = 'none';
      }
    }

    // Tags
    const profileTags = document.querySelector('.profile-tags');
    if (profileTags) {
      profileTags.innerHTML = '';
      if (user.location) {
        const span = document.createElement('span');
        span.className = 'ptag';
        span.textContent = `📍 ${user.location}`;
        profileTags.appendChild(span);
      }
      if (user.blog) {
        const span = document.createElement('span');
        span.className = 'ptag';
        let blogUrl = user.blog;
        if (!blogUrl.startsWith('http')) blogUrl = 'https://' + blogUrl;
        span.innerHTML = `<a href="${blogUrl}" target="_blank">🔗 ${user.blog.replace(/^https?:\/\//, '')}</a>`;
        profileTags.appendChild(span);
      }
      if (user.company) {
        const span = document.createElement('span');
        span.className = 'ptag';
        span.textContent = `🏢 ${user.company}`;
        profileTags.appendChild(span);
      }
    }

    // Quick Stats: Repos, Followers, Following, Joined
    const qsNums = document.querySelectorAll('.profile-quick-stats .qs-num');
    if (qsNums.length >= 4) {
      qsNums[0].textContent = user.public_repos;
      qsNums[1].textContent = formatNumber(user.followers);
      qsNums[2].textContent = formatNumber(user.following);
      qsNums[3].textContent = new Date(user.created_at).getFullYear();
    }

    // Stat Card calculations
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);
    const estCommits = Math.round(user.public_repos * 15 + totalStars * 1.5 + totalForks * 2 + user.followers * 0.5);

    let activeRepo = "None";
    if (repos.length > 0) {
      const sortedByStar = [...repos].sort((a,b) => b.stargazers_count - a.stargazers_count);
      activeRepo = sortedByStar[0].name;
    }

    const statValues = document.querySelectorAll('.stats-row .stat-card .stat-value');
    if (statValues.length >= 4) {
      statValues[0].textContent = formatNumber(totalStars);
      statValues[1].textContent = formatNumber(totalForks);
      statValues[2].textContent = formatNumber(estCommits);
      statValues[3].textContent = activeRepo;
    }

    // Dev Score
    const starsScore = Math.min(totalStars * 1.5, 30);
    const reposScore = Math.min(user.public_repos * 2, 20);
    const activityScore = Math.min(totalForks * 2 + user.public_repos * 0.5, 25);
    const communityScore = Math.min(user.followers / 10, 25);
    const totalScore = Math.round(starsScore + reposScore + activityScore + communityScore);

    const scoreNumber = document.querySelector('.score-number');
    if (scoreNumber) scoreNumber.textContent = totalScore;

    const scoreCircle = document.querySelector('.score-svg circle:nth-child(2)');
    if (scoreCircle) {
      const dashOffset = 326.7 * (1 - totalScore / 100);
      scoreCircle.style.strokeDashoffset = dashOffset;
    }

    // Tiers
    const gradeBadge = document.querySelector('.grade-badge');
    const gradeDesc = document.querySelector('.grade-desc');
    if (gradeBadge && gradeDesc) {
      let tier = "D Tier";
      let desc = "Aspiring Developer";
      if (totalScore >= 90) { tier = "S+ Tier"; desc = "Legendary Developer"; }
      else if (totalScore >= 80) { tier = "S Tier"; desc = "Elite Developer"; }
      else if (totalScore >= 75) { tier = "A Tier"; desc = "Master Developer"; }
      else if (totalScore >= 60) { tier = "B Tier"; desc = "Expert Developer"; }
      else if (totalScore >= 40) { tier = "C Tier"; desc = "Rising Developer"; }
      gradeBadge.textContent = tier;
      gradeDesc.textContent = desc;
    }

    // Score breakdown bars
    const sbItems = document.querySelectorAll('.score-breakdown .sb-item');
    if (sbItems.length >= 4) {
      const scores = [
        { val: Math.round(starsScore), max: 30 },
        { val: Math.round(reposScore), max: 20 },
        { val: Math.round(activityScore), max: 25 },
        { val: Math.round(communityScore), max: 25 }
      ];
      scores.forEach((s, idx) => {
        const pct = Math.round((s.val / s.max) * 100);
        sbItems[idx].querySelector('.sb-bar').style.width = `${pct}%`;
        sbItems[idx].querySelector('.sb-val').textContent = s.val;
      });
    }

    updateLanguages(repos);
    renderReposGrid();
    updateHeatmap(repos, user);
  }

  // Languages list and donut gradient
  function updateLanguages(repos) {
    const langSizes = {};
    let totalSize = 0;

    repos.forEach(repo => {
      if (repo.language) {
        const sizeVal = repo.size || 10;
        langSizes[repo.language] = (langSizes[repo.language] || 0) + sizeVal;
        totalSize += sizeVal;
      }
    });

    const langListEl = document.querySelector('.lang-list');
    const donutEl = document.querySelector('.donut');
    const donutMain = document.querySelector('.donut-main');
    const donutSub = document.querySelector('.donut-sub');

    if (totalSize === 0) {
      if (langListEl) langListEl.innerHTML = '<p class="text-muted">No languages found.</p>';
      if (donutEl) donutEl.style.background = '#ccc';
      if (donutMain) donutMain.textContent = 'N/A';
      return;
    }

    const sortedLangs = Object.entries(langSizes)
      .map(([name, size]) => ({ name, size, pct: Math.round((size / totalSize) * 100) }))
      .sort((a, b) => b.size - a.size);

    const topLangs = sortedLangs.slice(0, 4);
    let otherPct = 0;
    if (sortedLangs.length > 4) {
      const othersSum = sortedLangs.slice(4).reduce((sum, l) => sum + l.size, 0);
      otherPct = Math.round((othersSum / totalSize) * 100);
    }

    const finalLangs = [...topLangs];
    if (otherPct > 0) {
      finalLangs.push({ name: 'Others', pct: otherPct });
    }

    const langColors = {
      'JavaScript': '#f7df1e',
      'TypeScript': '#3178c6',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Python': '#3776ab',
      'C': '#555555',
      'C++': '#f34b7d',
      'Go': '#00add8',
      'Java': '#b07219',
      'PHP': '#4f5d95',
      'Ruby': '#701516',
      'Rust': '#ce422b',
      'Swift': '#f05138',
      'Shell': '#89e051',
      'Kotlin': '#A97BFF',
      'Others': '#cccccc'
    };

    let gradientParts = [];
    let currentPctSum = 0;
    finalLangs.forEach(lang => {
      const color = langColors[lang.name] || '#888888';
      const start = currentPctSum;
      currentPctSum += lang.pct;
      if (currentPctSum > 100) currentPctSum = 100;
      gradientParts.push(`${color} ${start}% ${currentPctSum}%`);
    });

    if (donutEl) donutEl.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    if (donutMain) donutMain.textContent = finalLangs[0] ? finalLangs[0].name : 'N/A';
    if (donutSub) donutSub.textContent = 'Primary';

    if (langListEl) {
      langListEl.innerHTML = '';
      finalLangs.forEach(lang => {
        const color = langColors[lang.name] || '#888888';
        const itemHTML = `
          <div class="lang-item">
            <span class="lang-dot" style="background:${color}"></span>
            <span class="lang-name">${lang.name}</span>
            <div class="lang-bar-wrap"><div class="lang-bar" style="width:${lang.pct}%;background:${color}"></div></div>
            <span class="lang-pct">${lang.pct}%</span>
          </div>
        `;
        langListEl.insertAdjacentHTML('beforeend', itemHTML);
      });
    }
  }

  // Repos Grid render
  function renderReposGrid(sortBy = 'stars') {
    const reposGrid = document.querySelector('.repos-grid');
    if (!reposGrid) return;

    const sorted = [...currentRepos];
    
    // Determine the sort by checking active button in case sortBy is not specified
    let currentSort = sortBy;
    const activeSortBtn = document.querySelector('.sort-btn.active');
    if (activeSortBtn) {
      if (activeSortBtn.textContent.includes('Forks')) currentSort = 'forks';
      else if (activeSortBtn.textContent.includes('Recent')) currentSort = 'recent';
    }

    if (currentSort === 'stars') {
      sorted.sort((a,b) => b.stargazers_count - a.stargazers_count);
    } else if (currentSort === 'forks') {
      sorted.sort((a,b) => b.forks_count - a.forks_count);
    } else if (currentSort === 'recent') {
      sorted.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    const displayRepos = isPrinting ? sorted : sorted.slice(0, 5);
    reposGrid.innerHTML = '';

    const langColors = {
      'JavaScript': '#f7df1e',
      'TypeScript': '#3178c6',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Python': '#3776ab',
      'C': '#555555',
      'C++': '#f34b7d',
      'Go': '#00add8',
      'Java': '#b07219',
      'PHP': '#4f5d95',
      'Ruby': '#701516',
      'Rust': '#ce422b',
      'Swift': '#f05138',
      'Shell': '#89e051',
      'Kotlin': '#A97BFF'
    };

    displayRepos.forEach(repo => {
      const langColor = langColors[repo.language] || '#888888';
      const updatedDate = new Date(repo.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const repoCardHTML = `
        <div class="repo-card">
          <div class="repo-card-top">
            <div class="repo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3h18v18H3z" stroke="var(--primary)" stroke-width="2" rx="2"/><path d="M8 12h8M12 8v8" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <span class="repo-visibility">${repo.private ? 'Private' : 'Public'}</span>
          </div>
          <h4 class="repo-name"><a href="${repo.html_url}" target="_blank">${repo.name}</a></h4>
          <p class="repo-desc">${repo.description || "No description provided."}</p>
          <div class="repo-tags">
            <span class="repo-lang-tag" style="--lc:${langColor}">● ${repo.language || 'Plain Text'}</span>
          </div>
          <div class="repo-stats">
            <span class="rs"><svg width="14" height="14" viewBox="0 0 24 24" fill="#ffa94d"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${repo.stargazers_count}</span>
            <span class="rs"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="M7 7H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3"/><path d="M17 3H21V7"/><line x1="10" y1="14" x2="21" y2="3"/></svg> ${repo.forks_count}</span>
            <span class="rs repo-updated">Updated ${updatedDate}</span>
          </div>
        </div>
      `;
      reposGrid.insertAdjacentHTML('beforeend', repoCardHTML);
    });

    if (!isPrinting) {
      const moreCount = sorted.length > 5 ? sorted.length - 5 : 0;
      const username = currentRepos[0] ? currentRepos[0].owner.login : '';
      const moreCardHTML = `
        <div class="repo-card repo-card-more">
          <div class="repo-more-inner">
            <div class="repo-more-num">${moreCount === 0 ? sorted.length : moreCount}</div>
            <div class="repo-more-label">${moreCount === 0 ? 'Total' : 'More'} Repositories</div>
            <a href="https://github.com/${username}?tab=repositories" target="_blank" class="repo-more-btn">View All →</a>
          </div>
        </div>
      `;
      reposGrid.insertAdjacentHTML('beforeend', moreCardHTML);
    }
  }

  // Heatmap update
  function updateHeatmap(repos, user) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const curMonth = new Date().getMonth();
    
    const monthBars = document.querySelectorAll('.month-bars .month-bar-item');
    if (monthBars.length >= 6) {
      for (let i = 0; i < 6; i++) {
        let mIdx = (curMonth - 5 + i + 12) % 12;
        monthBars[i].querySelector('.month-name').textContent = monthNames[mIdx];
        const factor = Math.min((user.public_repos / 10 + user.followers / 20) * 10, 100);
        const randomHeight = Math.max(15, Math.min(100, Math.round(factor * (0.6 + Math.random() * 0.6))));
        monthBars[i].querySelector('.mbar').style.height = `${randomHeight}%`;
      }
    }

    const cells = document.querySelectorAll('.heatmap-grid .hcell');
    const activityLevel = Math.min(user.public_repos / 15 + user.followers / 25, 4);
    cells.forEach(cell => {
      cell.className = 'hcell';
      const prob = Math.random();
      let lvl = 'l0';
      if (activityLevel > 0) {
        if (prob < 0.3) lvl = 'l0';
        else if (prob < 0.6) lvl = 'l1';
        else if (prob < 0.8) lvl = 'l2';
        else if (prob < 0.95) lvl = 'l3';
        else lvl = 'l4';
      }
      cell.classList.add(lvl);
    });
  }

  // Event Listeners for Search Button & Enter Key
  if (analyzeBtn && usernameInput) {
    analyzeBtn.addEventListener('click', () => {
      loadProfile(usernameInput.value.trim());
    });
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loadProfile(usernameInput.value.trim());
      }
    });
  }

  // Hint tags direct trigger
  hintTags.forEach(tag => {
    tag.addEventListener('click', () => {
      usernameInput.value = tag.textContent;
      loadProfile(tag.textContent);
    });
  });

  // CTA Input trigger
  if (ctaBtn && ctaInput) {
    ctaBtn.addEventListener('click', () => {
      const val = ctaInput.value.trim();
      if (val) {
        usernameInput.value = val;
        loadProfile(val);
      }
    });
    ctaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const val = ctaInput.value.trim();
        if (val) {
          usernameInput.value = val;
          loadProfile(val);
        }
      }
    });
  }

  // Repo grid sorting mechanism
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      let type = 'stars';
      if (btn.textContent.includes('Forks')) type = 'forks';
      else if (btn.textContent.includes('Recent')) type = 'recent';
      renderReposGrid(type);
    });
  });

  // Compare Profiles Logic
  const compareBtn = document.querySelector('.compare-btn');
  if (compareBtn) {
    compareBtn.addEventListener('click', async () => {
      const inputs = document.querySelectorAll('.ci-input');
      if (inputs.length < 2) return;
      const u1 = inputs[0].value.trim();
      const u2 = inputs[1].value.trim();

      if (!u1 || !u2) {
        alert("Please enter both usernames to compare.");
        return;
      }

      const origText = compareBtn.textContent;
      compareBtn.disabled = true;
      compareBtn.textContent = "Comparing...";

      try {
        const [user1Data, repos1Data] = await Promise.all([
          githubFetch(`https://api.github.com/users/${u1}`),
          githubFetch(`https://api.github.com/users/${u1}/repos?per_page=100`)
        ]);

        const [user2Data, repos2Data] = await Promise.all([
          githubFetch(`https://api.github.com/users/${u2}`),
          githubFetch(`https://api.github.com/users/${u2}/repos?per_page=100`)
        ]);

        // Calculate star/score metrics
        const stars1 = repos1Data.reduce((sum, r) => sum + r.stargazers_count, 0);
        const score1 = Math.min(stars1 * 1.5, 30) + Math.min(user1Data.public_repos * 2, 20) + Math.min(repos1Data.reduce((sum,r)=>sum+r.forks_count,0)*2 + user1Data.public_repos*0.5, 25) + Math.min(user1Data.followers/10, 25);
        
        const stars2 = repos2Data.reduce((sum, r) => sum + r.stargazers_count, 0);
        const score2 = Math.min(stars2 * 1.5, 30) + Math.min(user2Data.public_repos * 2, 20) + Math.min(repos2Data.reduce((sum,r)=>sum+r.forks_count,0)*2 + user2Data.public_repos*0.5, 25) + Math.min(user2Data.followers/10, 25);

        const ccNames = document.querySelectorAll('.cc-name');
        if (ccNames.length >= 2) {
          ccNames[0].textContent = user1Data.login;
          ccNames[1].textContent = user2Data.login;
        }

        const ccAvatars = document.querySelectorAll('.compare-col .cc-avatar');
        if (ccAvatars.length >= 2) {
          ccAvatars[0].src = user1Data.avatar_url;
          ccAvatars[1].src = user2Data.avatar_url;
        }

        const ccTiers = document.querySelectorAll('.compare-col .cc-tier');
        if (ccTiers.length >= 2) {
          const getTier = (score) => {
            if (score >= 90) return "S+ Tier";
            if (score >= 80) return "S Tier";
            if (score >= 75) return "A Tier";
            if (score >= 60) return "B Tier";
            if (score >= 40) return "C Tier";
            return "D Tier";
          };
          ccTiers[0].textContent = getTier(score1);
          ccTiers[1].textContent = getTier(score2);
        }

        const cmLabels = document.querySelectorAll('.compare-metrics .cm-label');
        const u1Metrics = [stars1, user1Data.followers, user1Data.public_repos, Math.round(score1)];
        const u2Metrics = [stars2, user2Data.followers, user2Data.public_repos, Math.round(score2)];
        const metricNames = ["Stars", "Followers", "Repos", "Score"];

        const leftBars = document.querySelectorAll('.cm-bar-left');
        const rightBars = document.querySelectorAll('.cm-bar-right');

        for (let i = 0; i < 4; i++) {
          const val1 = u1Metrics[i];
          const val2 = u2Metrics[i];
          if (cmLabels[i]) {
            cmLabels[i].textContent = `${metricNames[i]} (${formatNumber(val1)} vs ${formatNumber(val2)})`;
          }

          const sum = val1 + val2;
          let pct1 = 50;
          let pct2 = 50;
          if (sum > 0) {
            pct1 = Math.round((val1 / sum) * 100);
            pct2 = Math.round((val2 / sum) * 100);
          }
          if (leftBars[i]) leftBars[i].style.width = `${pct1}%`;
          if (rightBars[i]) rightBars[i].style.width = `${pct2}%`;
        }

        const ciAvatars = document.querySelectorAll('.ci-avatar');
        if (ciAvatars.length >= 2) {
          ciAvatars[0].src = user1Data.avatar_url;
          ciAvatars[1].src = user2Data.avatar_url;
        }
      } catch (error) {
        alert("Error in comparison: " + error.message);
      } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = origText;
      }
    });
  }

  // Input changes reflect avatars quickly
  document.querySelectorAll('.ci-input').forEach((input, index) => {
    input.addEventListener('change', () => {
      const u = input.value.trim();
      const avatar = document.querySelectorAll('.ci-avatar')[index];
      if (u && avatar) {
        avatar.src = `https://github.com/${u}.png`;
      }
    });
  });

  // PDF Export trigger
  document.addEventListener('click', (e) => {
    if (e.target.closest('#export-pdf-btn')) {
      window.print();
    }
  });

  // Window print event handlers to toggle full repo list rendering
  window.addEventListener('beforeprint', () => {
    isPrinting = true;
    renderReposGrid();
  });
  window.addEventListener('afterprint', () => {
    isPrinting = false;
    renderReposGrid();
  });

  // Initial load
  loadProfile('torvalds');
});
