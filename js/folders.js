// ==========================================
// CÂY THƯ MỤC LƯU TRỮ & DANH MỤC THEO QUYỀN
// ==========================================

// Lọc các Mục lưu trữ trong Form tải lên theo Quyền hạn, Tổ & Chức vụ kiêm nhiệm
function renderAllowedCategories() {
  const categorySelect = document.getElementById("category");
  if (!categorySelect || !userProfile) return;

  const role = userProfile.role;
  const userPos = userProfile.position || "none";
  const isVanPhong = Boolean(
    userProfile.department && userProfile.department.toLowerCase().includes("văn phòng")
  );

  categorySelect.innerHTML = "";

  CATEGORY_GROUPS.forEach(group => {
    if (!group.roles.includes(role)) return;

    if (role !== "admin") {
      if (group.excludeDept && isVanPhong) return;
      if (group.onlyDept && !isVanPhong && role !== "clerk") return;
      if (group.requirePosition && role !== "clerk" && userPos === "none") return;
    }

    const validOptions = group.options.filter(opt => {
      if (opt.allowedRoles && !opt.allowedRoles.includes(role)) return false;
      if (opt.pos && role !== "admin" && role !== "clerk") {
        return opt.pos.includes(userPos);
      }
      return true;
    });

    if (validOptions.length === 0) return;

    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;

    validOptions.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.innerText = opt.text;
      optgroup.appendChild(optionEl);
    });

    categorySelect.appendChild(optgroup);
  });
}

// Dựng cây thư mục bên trái
function renderFolderTree() {
  const container = document.getElementById("folder-tree-container");
  if (!container || !userProfile) return;

  const role = userProfile.role;
  const userPos = userProfile.position || "none";
  const isVanPhong = Boolean(
    userProfile.department && userProfile.department.toLowerCase().includes("văn phòng")
  );
  const treeData = getFolderTreeConfig(role, userProfile.department);

  container.innerHTML = "";

  treeData.forEach(folder => {
    if (!folder.roles.includes(role)) return;
    if (role !== "admin") {
      if (folder.excludeDept && isVanPhong) return;
      if (folder.onlyDept && !isVanPhong && role !== "clerk") return;
      if (folder.requirePosition && role !== "clerk" && userPos === "none") return;
    }

    const validChildren = folder.children.filter(sub => {
      if (sub.pos && role !== "admin" && role !== "clerk") {
        return sub.pos.includes(userPos);
      }
      return true;
    });

    if (validChildren.length === 0) return;

    const parentDiv = document.createElement("div");
    parentDiv.className = "space-y-0.5";

    const headerBtn = document.createElement("button");
    headerBtn.type = "button";
    headerBtn.className = "w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-semibold text-left transition";
    headerBtn.innerHTML = `
      <span class="flex items-center truncate">
        <span class="mr-2 text-amber-500">📁</span>
        <span class="truncate">${escapeHTML(folder.name)}</span>
      </span>
      <svg class="w-3.5 h-3.5 text-slate-400 transform transition-transform duration-200 rotate-90" id="arrow-${escapeHTML(folder.id)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    `;

    const childrenContainer = document.createElement("div");
    childrenContainer.id = `tree-children-${folder.id}`;
    childrenContainer.className = "pl-4 space-y-0.5 border-l border-slate-200 ml-3.5";

    headerBtn.onclick = () => {
      if (folder.isShared) {
        loadSharedDocs(null, "Kho chung toàn trường (Tất cả)");
        switchTab("shared");
      }
      childrenContainer.classList.toggle("hidden");
      const arrowEl = document.getElementById(`arrow-${folder.id}`);
      if (arrowEl) arrowEl.classList.toggle("rotate-90");
    };

    validChildren.forEach(sub => {
      const subBtn = document.createElement("button");
      subBtn.type = "button";
      subBtn.id = `tree-node-${sub.value}`;
      subBtn.className = "tree-node-btn w-full text-left px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 text-xs font-medium flex items-center transition";
      subBtn.innerHTML = `<span class="mr-1.5 text-slate-400">└</span> <span class="truncate">${escapeHTML(sub.name)}</span>`;
      subBtn.onclick = () => openFolderNode(folder.id, folder.name, sub.value, sub.name, folder.isShared);
      childrenContainer.appendChild(subBtn);
    });

    parentDiv.appendChild(headerBtn);
    parentDiv.appendChild(childrenContainer);
    container.appendChild(parentDiv);
  });
}

// Xử lý khi bấm vào 1 nhánh con trên cây thư mục
async function openFolderNode(folderId, parentName, categoryValue, categoryName, isShared) {
  document.querySelectorAll(".tree-node-btn").forEach(el => {
    el.classList.remove("bg-blue-100", "text-blue-800", "font-bold");
  });
  const activeNode = document.getElementById(`tree-node-${categoryValue}`);
  if (activeNode) activeNode.classList.add("bg-blue-100", "text-blue-800", "font-bold");

  if (isShared) {
    loadSharedDocs(categoryValue, `Kho chung toàn trường / ${categoryName}`);
    switchTab("shared");
    scrollToRightContent();
    return;
  }

  currentSelectedCategory = categoryValue;
  currentFolderContext = { folderId, parentName, categoryValue, categoryName, isShared };

  const folderDeptFilter = document.getElementById("folder_filter_department");
  if (folderDeptFilter) {
    if (folderId === "dept" && userProfile.role === "admin") {
      folderDeptFilter.classList.remove("hidden");
      folderDeptFilter.disabled = false;
    } else if (folderId === "dept" && (userProfile.role === "hod" || userProfile.role === "vice_hod")) {
      const normDept = normalizeDepartmentName(userProfile.department);
      if (![...folderDeptFilter.options].some(o => o.value === normDept)) {
        const opt = document.createElement("option");
        opt.value = normDept;
        opt.innerText = normDept;
        folderDeptFilter.appendChild(opt);
      }
      folderDeptFilter.value = normDept;
      folderDeptFilter.disabled = true;
      folderDeptFilter.classList.remove("hidden");
    } else {
      folderDeptFilter.classList.add("hidden");
      folderDeptFilter.value = "all";
    }
  }

  switchTab("folder-view");
  scrollToRightContent();
  await reloadCurrentFolderNode();
}

// Tải và lọc danh sách hồ sơ của thư mục đang mở
async function reloadCurrentFolderNode() {
  if (!currentFolderContext) return;
  const { folderId, parentName, categoryValue, categoryName } = currentFolderContext;

  const folderDeptFilter = document.getElementById("folder_filter_department");
  const selectedDept =
    folderId === "dept" && folderDeptFilter && !folderDeptFilter.classList.contains("hidden")
      ? folderDeptFilter.value
      : "all";

  const deptBadgeHtml =
    folderId === "dept" && selectedDept !== "all"
      ? `<span class="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">${escapeHTML(selectedDept)}</span>`
      : "";

  document.getElementById("folder-view-breadcrumb").innerText =
    folderId === "dept" && selectedDept !== "all"
      ? `${parentName} / ${categoryName} / ${selectedDept}`
      : `${parentName} / ${categoryName}`;
  document.getElementById("folder-view-title").innerHTML = `<span>📂 ${escapeHTML(categoryName)}</span> ${deptBadgeHtml}`;

  const tbody = document.getElementById("folder-docs-body");
  tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Đang tải dữ liệu thư mục...</td></tr>`;

  let query = client.from("submissions")
    .select("*")
    .eq("category", categoryValue)
    .order("submitted_at", { ascending: false })
    .limit(2000);

  if (userProfile.role === "teacher") {
    query = query.eq("teacher_id", currentUser.id);
  } else if (userProfile.role === "hod" || userProfile.role === "vice_hod" || userProfile.role === "clerk") {
    query = query.eq("department", userProfile.department);
  } else if (userProfile.role === "admin" && folderId === "dept" && selectedDept !== "all") {
    query = query.eq("department", selectedDept);
  }

  const { data, error } = await query;
  tbody.innerHTML = "";

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">Chưa có hồ sơ nào trong thư mục này.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-3.5 font-medium text-slate-900">${escapeHTML(item.teacher_name)}</td>
      <td class="p-3.5 text-slate-600">${escapeHTML(item.department)}</td>
      <td class="p-3.5 text-slate-600">${item.grade ? "Khối " + escapeHTML(item.grade) : "Toàn trường"} - T${escapeHTML(item.week_no || "-")}</td>
      <td class="p-3.5 text-slate-800">${escapeHTML(item.title)}</td>
      <td class="p-3.5">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}">
          <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === "approved" ? "bg-emerald-500" : "bg-amber-500"}"></span>
          ${item.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
        </span>
      </td>
      <td class="p-3.5 text-right">
        <a href="${safeUrl(item.file_url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-semibold">Mở tệp</a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openUploadForCurrentFolder() {
  switchTab("upload");
  if (currentSelectedCategory) {
    const catSelect = document.getElementById("category");
    if (catSelect) catSelect.value = currentSelectedCategory;
  }
}
