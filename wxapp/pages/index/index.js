const { TALENT_DATA, TALENT_CLASS_LIST } = require("../../data/talent-data");

const MAX_POINTS = 51;
const ICON_FALLBACK = "/icons/inv_misc_questionmark.png";

const CLASS_NAME_FALLBACK = {
  warrior: "战士",
  paladin: "圣骑士",
  mage: "法师",
  hunter: "猎人",
  rogue: "盗贼",
  priest: "牧师",
  shaman: "萨满",
  warlock: "术士",
  druid: "德鲁伊"
};

const TREE_NAME_FALLBACK = {
  warrior: ["武器", "狂怒", "防护"],
  paladin: ["神圣", "防护", "惩戒"],
  mage: ["奥术", "火焰", "冰霜"],
  hunter: ["野兽掌握", "射击", "生存"],
  rogue: ["刺杀", "战斗", "敏锐"],
  priest: ["戒律", "神圣", "暗影"],
  shaman: ["元素", "增强", "恢复"],
  warlock: ["痛苦", "恶魔学识", "毁灭"],
  druid: ["平衡", "野性战斗", "恢复"]
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function iconPath(rawIcon) {
  if (!rawIcon || typeof rawIcon !== "string") return ICON_FALLBACK;
  const normalized = rawIcon.trim().toLowerCase();
  if (!normalized) return ICON_FALLBACK;
  const fileName = normalized.endsWith(".png") ? normalized : `${normalized}.png`;
  return `/icons/${fileName}`;
}

function normalizeClassName(classId, rawClass) {
  return CLASS_NAME_FALLBACK[classId] || rawClass?.name || classId;
}

function normalizeTreeName(classId, rawTree, treeIndex) {
  return (
    (TREE_NAME_FALLBACK[classId] && TREE_NAME_FALLBACK[classId][treeIndex]) ||
    rawTree?.nameCn ||
    rawTree?.name ||
    `天赋树 ${treeIndex + 1}`
  );
}

function normalizeTalent(talent, index) {
  const reqFromNested = talent?.requires?.talent;
  const reqRanksFromNested = talent?.requires?.ranks;
  return {
    id: toNumber(talent?.id, index + 1),
    name: talent?.n || talent?.name || `天赋 ${index + 1}`,
    icon: talent?.i || talent?.icon || "",
    max: Math.max(1, toNumber(talent?.m ?? talent?.maxRanks ?? talent?.max, 1)),
    row: Math.max(0, toNumber(talent?.r ?? talent?.row, 0)),
    col: Math.max(0, toNumber(talent?.c ?? talent?.col, 0)),
    req: talent?.req ?? reqFromNested ?? null,
    reqRanks: Math.max(1, toNumber(talent?.reqRanks ?? reqRanksFromNested, 1)),
    desc: talent?.desc || "",
    descCn: talent?.descCn || ""
  };
}

function normalizeClassModel(classId, rawClass) {
  const trees = (rawClass?.trees || []).map((rawTree, treeIndex) => {
    const talents = (rawTree.talents || []).map((talent, talentIndex) => normalizeTalent(talent, talentIndex));
    const idToIndex = {};
    talents.forEach((talent, talentIndex) => {
      if (idToIndex[talent.id] === undefined) {
        idToIndex[talent.id] = talentIndex;
      }
    });
    return {
      treeIndex,
      name: normalizeTreeName(classId, rawTree, treeIndex),
      icon: rawTree?.icon || "",
      talents,
      idToIndex
    };
  });
  return {
    id: classId,
    name: normalizeClassName(classId, rawClass),
    color: rawClass?.color || "#d6b36f",
    trees
  };
}

Page({
  data: {
    classList: [],
    currentClassId: "",
    currentClassName: "",
    currentClassColor: "#d6b36f",
    pointsLeft: MAX_POINTS,
    treeViews: []
  },

  onLoad() {
    const classList = (TALENT_CLASS_LIST || Object.keys(TALENT_DATA)).map((entry) => {
      const classId = typeof entry === "string" ? entry : entry.id;
      return {
        id: classId,
        name: CLASS_NAME_FALLBACK[classId] || entry.n || classId,
        iconPath: iconPath(entry.icon || `class_${classId}`),
        active: false
      };
    });

    this._state = {
      classList,
      model: null,
      ranksByTree: [],
      pointsLeft: MAX_POINTS
    };

    const initialClassId = classList.length ? classList[0].id : "warrior";
    this.initializeClass(initialClassId);
  },

  onClassTap(event) {
    const classId = event.currentTarget.dataset.id;
    this.initializeClass(classId);
  },

  onTalentTap(event) {
    const treeIndex = toNumber(event.currentTarget.dataset.tree, -1);
    const talentIndex = toNumber(event.currentTarget.dataset.index, -1);
    if (!this.canAddRank(treeIndex, talentIndex)) {
      wx.showToast({
        title: this.getBlockedReason(treeIndex, talentIndex),
        icon: "none",
        duration: 1200
      });
      return;
    }
    this._state.ranksByTree[treeIndex][talentIndex] += 1;
    this._state.pointsLeft -= 1;
    this.refreshView();
  },

  onTalentLongPress(event) {
    const treeIndex = toNumber(event.currentTarget.dataset.tree, -1);
    const talentIndex = toNumber(event.currentTarget.dataset.index, -1);
    if (!this.canRemoveRank(treeIndex, talentIndex)) {
      wx.showToast({
        title: "该点数被后续天赋依赖",
        icon: "none",
        duration: 1200
      });
      return;
    }
    this._state.ranksByTree[treeIndex][talentIndex] -= 1;
    this._state.pointsLeft += 1;
    this.refreshView();
  },

  initializeClass(classId) {
    const rawClass = TALENT_DATA[classId];
    if (!rawClass) {
      wx.showToast({ title: `职业数据不存在: ${classId}`, icon: "none" });
      return;
    }

    const model = normalizeClassModel(classId, rawClass);
    const ranksByTree = model.trees.map((tree) => tree.talents.map(() => 0));

    this._state.model = model;
    this._state.ranksByTree = ranksByTree;
    this._state.pointsLeft = MAX_POINTS;
    this.refreshView();
  },

  refreshView() {
    const model = this._state.model;
    if (!model) return;

    const classList = this._state.classList.map((item) => ({
      ...item,
      active: item.id === model.id
    }));

    const treeViews = model.trees.map((tree, treeIndex) => {
      const treeRanks = this._state.ranksByTree[treeIndex];
      const pointsSpent = this.getTreeSpent(treeIndex);

      const talents = tree.talents.map((talent, talentIndex) => {
        const rank = treeRanks[talentIndex];
        const canAdd = this.canAddRank(treeIndex, talentIndex);
        const stateClass = this.getTalentStateClass(rank, talent.max, canAdd);
        return {
          talentKey: `${treeIndex}-${talentIndex}`,
          treeIndex,
          talentIndex,
          name: talent.name,
          iconPath: iconPath(talent.icon),
          rankText: `${rank}/${talent.max}`,
          stateClass,
          positionStyle: `grid-column:${talent.col + 1};grid-row:${talent.row + 1};`
        };
      });

      return {
        treeIndex,
        name: tree.name,
        iconPath: iconPath(tree.icon),
        pointsSpent,
        talents
      };
    });

    this.setData({
      classList,
      currentClassId: model.id,
      currentClassName: model.name,
      currentClassColor: model.color,
      pointsLeft: this._state.pointsLeft,
      treeViews
    });
  },

  getTalentStateClass(rank, max, canAdd) {
    if (rank >= max && rank > 0) return "talent maxed";
    if (rank > 0) return "talent active";
    if (canAdd) return "talent available";
    return "talent locked";
  },

  getTreeSpent(treeIndex) {
    const ranks = this._state.ranksByTree[treeIndex] || [];
    return ranks.reduce((sum, rank) => sum + rank, 0);
  },

  canAddRank(treeIndex, talentIndex) {
    if (!this._state.model) return false;
    if (this._state.pointsLeft <= 0) return false;

    const tree = this._state.model.trees[treeIndex];
    if (!tree) return false;
    const talent = tree.talents[talentIndex];
    if (!talent) return false;

    const ranks = this._state.ranksByTree[treeIndex];
    const currentRank = ranks[talentIndex];
    if (currentRank >= talent.max) return false;

    const treeSpent = this.getTreeSpent(treeIndex);
    if (treeSpent < talent.row * 5) return false;

    return this.hasPrerequisite(tree, talent, ranks);
  },

  canRemoveRank(treeIndex, talentIndex) {
    const tree = this._state.model?.trees?.[treeIndex];
    if (!tree) return false;

    const currentRanks = this._state.ranksByTree[treeIndex];
    if (!currentRanks || currentRanks[talentIndex] <= 0) return false;

    const simulatedRanks = currentRanks.slice();
    simulatedRanks[talentIndex] -= 1;
    const simulatedSpent = simulatedRanks.reduce((sum, rank) => sum + rank, 0);

    for (let i = 0; i < tree.talents.length; i += 1) {
      if (simulatedRanks[i] <= 0) continue;
      const talent = tree.talents[i];
      if (simulatedSpent < talent.row * 5) return false;
      if (!this.hasPrerequisite(tree, talent, simulatedRanks)) return false;
    }
    return true;
  },

  hasPrerequisite(tree, talent, ranks) {
    if (talent.req === null || talent.req === undefined) return true;
    const reqIndex = tree.idToIndex[talent.req];
    if (reqIndex === undefined) return false;
    const requiredRanks = Math.max(1, talent.reqRanks || 1);
    return (ranks[reqIndex] || 0) >= requiredRanks;
  },

  getBlockedReason(treeIndex, talentIndex) {
    const tree = this._state.model?.trees?.[treeIndex];
    if (!tree) return "天赋树不存在";
    const talent = tree.talents[talentIndex];
    if (!talent) return "天赋不存在";

    const treeSpent = this.getTreeSpent(treeIndex);
    const ranks = this._state.ranksByTree[treeIndex];
    const currentRank = ranks[talentIndex] || 0;

    if (this._state.pointsLeft <= 0) return "点数已用完";
    if (currentRank >= talent.max) return "该天赋已满级";
    if (treeSpent < talent.row * 5) return `该层需要 ${talent.row * 5} 点`;
    if (!this.hasPrerequisite(tree, talent, ranks)) {
      const reqIndex = tree.idToIndex[talent.req];
      const reqTalent = reqIndex !== undefined ? tree.talents[reqIndex] : null;
      const reqName = reqTalent ? reqTalent.name : "前置天赋";
      return `需要前置: ${reqName}`;
    }
    return "当前不可加点";
  }
});
