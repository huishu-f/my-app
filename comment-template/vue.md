```vue
<script setup lang="ts">
/**
 * @file GoodsCard.vue
 * @description 商品卡片组件：展示商品基础信息、标签、操作按钮；支持选中态、禁用态、自定义插槽
 */
import { ref, computed, watch } from 'vue';

/**
 * 商品上下架状态
 */
export enum GoodsStatusEnum {
  /** 未上架 */
  OFF_SHELF = 0,
  /** 已上架 */
  ON_SHELF = 1,
  /** 售罄 */
  SOLD_OUT = 2,
}

/**
 * 商品标签
 */
export type GoodsTag = {
  /** 标签文本 */
  label: string;
  /** 标签主题色 */
  color: string;
};

/**
 * 商品基础数据结构（来自后端 /goods 接口）
 */
export interface GoodsItem {
  /** 商品唯一 id */
  id: string;
  /** 商品名称 */
  name: string;
  /** 商品封面图地址，缺省时用兜底图 */
  cover?: string;
  /** 售价，单位元 */
  price: number;
  /** 商品状态 {@link GoodsStatusEnum} */
  status: GoodsStatusEnum;
  /** 商品标签列表 */
  tags?: GoodsTag[];
}

/**
 * 组件入参
 */
export interface GoodsCardProps {
  /** 商品数据 */
  data: GoodsItem;
  /** 是否禁用全部操作，默认 false */
  disabled?: boolean;
}

const props = defineProps<GoodsCardProps>();

/** 组件触发事件（Vue 3.3+ 具名元组写法） */
const emit = defineEmits<{
  /** 卡片主体点击 */
  click: [record: GoodsItem];
  /** 编辑按钮点击 */
  edit: [record: GoodsItem];
}>();

/** 双向绑定：选中态，默认 false */
const selected = defineModel<boolean>('selected', { default: false });

/** 默认图片兜底地址 */
const DEFAULT_GOODS_COVER = '/assets/images/goods-default.png';
/** 最多默认展示标签数量 */
const MAX_VISIBLE_TAG_COUNT = 3;

/** 图片加载异常标记 */
const imgError = ref(false);
/** 是否展开标签列表 */
const tagExpand = ref(false);
/** 缓存上一次商品 ID，用于数据切换判断 */
const prevGoodsId = ref<string | null>(null);

/**
 * 根据状态获取展示文本
 * @param s 商品状态枚举值 {@link GoodsStatusEnum}
 * @returns 状态文本
 */
const getStatusText = (s: GoodsStatusEnum): string => {
  switch (s) {
    case GoodsStatusEnum.ON_SHELF:
      return '已上架';
    case GoodsStatusEnum.OFF_SHELF:
      return '未上架';
    case GoodsStatusEnum.SOLD_OUT:
      return '售罄';
    default:
      return '未知';
  }
};

/**
 * 计算需要渲染的标签数组，收起时按上限截断
 */
const visibleTagList = computed(() => {
  const tags = props.data.tags ?? [];
  return tagExpand.value ? tags : tags.slice(0, MAX_VISIBLE_TAG_COUNT);
});

/**
 * 标签是否超出默认展示数量，控制展开按钮显隐
 */
const hasOverflowTag = computed(() => {
  const tags = props.data.tags ?? [];
  return tags.length > MAX_VISIBLE_TAG_COUNT;
});

/**
 * 监听选中态变更，重置标签展开标记
 */
watch(selected, () => {
  tagExpand.value = false;
});

/**
 * 监听商品数据切换（id 变化），重置图片兜底与展开标记
 */
watch(
  () => props.data.id,
  (newId) => {
    if (prevGoodsId.value !== newId) {
      imgError.value = false;
      tagExpand.value = false;
      prevGoodsId.value = newId;
    }
  },
);

/** 卡片主体点击 */
const handleCardClick = () => {
  if (props.disabled) return;
  emit('click', props.data);
};

/** 编辑按钮点击（阻止冒泡，避免触发卡片 click） */
const handleEditClick = () => {
  if (props.disabled) return;
  emit('edit', props.data);
};

/** 图片加载失败，启用兜底图 */
const handleImgError = () => {
  imgError.value = true;
};

/** 切换标签展开/收起 */
const toggleTagExpand = () => {
  tagExpand.value = !tagExpand.value;
};

/** 组件对外暴露的方法 */
defineExpose({
  /** 重置内部状态（展开标记、图片兜底标记） */
  reset: () => {
    tagExpand.value = false;
    imgError.value = false;
  },
});
</script>

<template>
  <div
    class="goods-card"
    :class="{ selected: selected, disabled: props.disabled }"
    @click="handleCardClick"
  >
    <div class="goods-cover">
      <!-- 加载异常或无地址时降级为兜底图 -->
      <img
        :src="imgError || !props.data.cover ? DEFAULT_GOODS_COVER : props.data.cover"
        :alt="props.data.name"
        @error="handleImgError"
      />
    </div>

    <div class="goods-info">
      <h3 class="goods-name">{{ props.data.name }}</h3>
      <!-- 自定义子标题插槽 -->
      <slot name="subTitle"></slot>
      <div class="goods-price">¥{{ props.data.price.toFixed(2) }}</div>
      <div class="goods-status">{{ getStatusText(props.data.status) }}</div>

      <div class="goods-tags">
        <!-- 单标签用 label 作 key（标签由运营配置，保证不重复） -->
        <span v-for="tag in visibleTagList" :key="tag.label" :style="{ color: tag.color }">
          {{ tag.label }}
        </span>
        <button v-if="hasOverflowTag" type="button" @click="toggleTagExpand">
          {{ tagExpand ? '收起' : `+${(props.data.tags?.length ?? 0) - MAX_VISIBLE_TAG_COUNT}` }}
        </button>
      </div>
    </div>

    <div class="goods-footer">
      <!-- @click.stop 阻止冒泡，事件处理函数内不再重复 stopPropagation -->
      <button @click.stop="handleEditClick">编辑</button>
      <!-- 自定义底部扩展插槽 -->
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* 组件样式：设计令牌见 frontend/src/styles/tokens.css，禁止裸值 */
.goods-card {
  border: 1px solid var(--color-stroke);
  padding: 12px;
}
/* 选中态描边 */
.goods-card.selected {
  border-color: var(--color-accent);
}
/* 禁用态：降透明度并吞掉指针事件 */
.goods-card.disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
```
