```tsx
/**
 * @file GoodsCard.tsx
 * @description 商品卡片组件：展示商品基础信息、标签、操作按钮；支持选中态、禁用态、自定义底部操作区
 */
import {
  FC,
  ReactNode,
  MouseEvent,
  ReactElement,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';

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
 * GoodsCard 组件入参
 */
export interface GoodsCardProps {
  /** 商品数据 */
  data: GoodsItem;
  /** 是否选中，默认 false */
  selected?: boolean;
  /** 是否禁用全部操作，默认 false */
  disabled?: boolean;
  /** 卡片主体点击事件 */
  onClick?: (record: GoodsItem, e: MouseEvent<HTMLDivElement>) => void;
  /** 点击编辑按钮回调 */
  onEdit?: (record: GoodsItem) => void;
  /** 自定义底部插槽 */
  extraFooter?: ReactNode;
  /** 自定义子标题元素 */
  subTitleSlot?: ReactElement;
}

/** 默认图片兜底地址 */
const DEFAULT_GOODS_COVER = '/assets/images/goods-default.png';

/** 最多默认展示标签数量 */
const MAX_VISIBLE_TAG_COUNT = 3;

/**
 * GoodsCard 商品卡片
 * @param props {@link GoodsCardProps}
 * @example
 * <GoodsCard
 *   data={goods}
 *   selected={selectedId === goods.id}
 *   onEdit={(g) => openEditModal(g)}
 * />
 */
const GoodsCard: FC<GoodsCardProps> = (props) => {
  const {
    data,
    selected = false,
    disabled = false,
    onClick,
    onEdit,
    extraFooter,
    subTitleSlot,
  } = props;
  const { name, cover, price, status, tags = [] } = data;

  /** 图片加载异常标记 */
  const [imgError, setImgError] = useState(false);
  /** 是否展开标签列表 */
  const [tagExpand, setTagExpand] = useState(false);

  /** 卡片 DOM 容器 Ref，用于外部获取元素 */
  const cardRef = useRef<HTMLDivElement>(null);
  /** 持久化上一次商品 ID，用于判断数据切换 */
  const prevGoodsIdRef = useRef<string | null>(null);

  /**
   * 监听外部选中态变更，重置内部展开标记
   */
  useEffect(() => {
    setTagExpand(false);
  }, [selected]);

  /**
   * 监听商品数据切换（id 变化），重置图片兜底与展开标记
   */
  useEffect(() => {
    if (prevGoodsIdRef.current !== data.id) {
      setImgError(false);
      setTagExpand(false);
      prevGoodsIdRef.current = data.id;
    }
  }, [data.id]);

  /**
   * 获取状态对应的展示文字
   * @param s 商品状态枚举值 {@link GoodsStatusEnum}
   * @returns 状态文本
   */
  const getStatusText = useCallback((s: GoodsStatusEnum): string => {
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
  }, []);

  /**
   * 计算当前需要渲染的标签数组，收起时按上限截断
   */
  const visibleTagList = useMemo(() => {
    return tagExpand ? tags : tags.slice(0, MAX_VISIBLE_TAG_COUNT);
  }, [tagExpand, tags]);

  /**
   * 标签是否超出默认展示数量，控制展开按钮显隐
   */
  const hasOverflowTag = useMemo(() => tags.length > MAX_VISIBLE_TAG_COUNT, [tags]);

  /**
   * 卡片主体点击处理
   * @param e 原生鼠标事件
   */
  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(data, e);
  };

  /**
   * 编辑按钮点击（阻止冒泡，避免触发卡片 onClick）
   */
  const handleEditClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    onEdit?.(data);
  };

  /** 图片加载失败，启用兜底图 */
  const handleImgError = () => setImgError(true);

  /** 切换标签展开/收起 */
  const toggleTagExpand = () => setTagExpand((prev) => !prev);

  return (
    // JSX 内只注释"为什么"，不复述标签结构
    <div
      ref={cardRef}
      className={`goods-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleCardClick}
    >
      <div className="goods-cover">
        {/* 加载异常或无地址时降级为兜底图 */}
        <img
          src={imgError || !cover ? DEFAULT_GOODS_COVER : cover}
          alt={name}
          onError={handleImgError}
        />
      </div>

      <div className="goods-info">
        <h3 className="goods-name">{name}</h3>
        {subTitleSlot}
        <div className="goods-price">¥{price.toFixed(2)}</div>
        <div className="goods-status">{getStatusText(status)}</div>

        <div className="goods-tags">
          {/* 单标签用 label 作 key（标签由运营配置，保证不重复） */}
          {visibleTagList.map((tag) => (
            <span key={tag.label} style={{ color: tag.color }}>
              {tag.label}
            </span>
          ))}
          {hasOverflowTag && (
            <button type="button" onClick={toggleTagExpand}>
              {tagExpand ? '收起' : `+${tags.length - MAX_VISIBLE_TAG_COUNT}`}
            </button>
          )}
        </div>
      </div>

      <div className="goods-footer">
        <button onClick={handleEditClick}>编辑</button>
        {extraFooter}
      </div>
    </div>
  );
};

export default GoodsCard;
```
