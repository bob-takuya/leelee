import { useStore } from '../store';

const GUIDE: Record<string, { title: string; body: string }> = {
  place: {
    title: '① 節点を配置する',
    body:
      'Lee & Lee 手法の起点は 3D 空間の節点群です。ビューポートの床面をクリックするか、' +
      '下のリストに直接座標を入力して節点を追加してください。プリセットから始めるのもおすすめです。',
  },
  strut: {
    title: '② ストラットを選ぶ',
    body:
      '論文の特徴は「ストラットをユーザが手動で指定する」ことです。Ground Structure のメンバー' +
      'をクリックすると赤いストラット（圧縮材）として登録されます。Class 1 条件（ストラット同士が節点を共有しない）' +
      'を守ると、探索が安定しやすくなります。',
  },
  optimize: {
    title: '③ GA で最適化する',
    body:
      '残りのメンバーをケーブル候補とみなし、Genetic Algorithm で「自己応力が存在する最小ケーブル集合」' +
      'を探索します。世代ごとに最良適合度が更新され、収束グラフとしてリアルタイムに表示されます。',
  },
  result: {
    title: '④ 結果を確認する',
    body:
      '得られたトポロジーに対し、Force Density 法で自己応力ベクトル w を計算しました。' +
      '各メンバーの q 値・符号・安定性判定を右のパネルで確認できます。',
  },
};

export default function StepGuide() {
  const step = useStore((s) => s.step);
  const g = GUIDE[step];
  return (
    <div className="section">
      <div className="section-title">ステップ</div>
      <div className="text-sm font-semibold text-slate-100">{g.title}</div>
      <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{g.body}</p>
    </div>
  );
}
