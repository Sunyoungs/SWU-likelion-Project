import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Checkbox from '../Checkbox';
import RoleBadge from '../RoleBadge';
import StatusBadge from '../StatusBadge';
import { getDdayBadge, isCompletenessMet } from '../../utils/handoverFormat';
import styles from './HandoverTable.module.css';

const HandoverTable = ({ items, selectedIds, onSelect }) => {
  const navigate = useNavigate();

  return (
    <table className={styles.table}>
      <colgroup>
        <col style={{ width: '10%' }} />
        <col style={{ width: '16%' }} />
        <col />
        <col style={{ width: '22%' }} />
        <col style={{ width: '22%' }} />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">선택</th>
          <th scope="col">역할</th>
          <th scope="col">인수인계서 명</th>
          <th scope="col">완성도 점수</th>
          <th scope="col">D-day</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const met = isCompletenessMet(item);
          const path = `/handovers/${item.projectId}/documents`;
          return (
            <tr key={item.projectId} className={styles.row} onClick={() => navigate(path)}>
              <td>
                <Checkbox
                  checked={selectedIds.has(item.projectId)}
                  onChange={(checked) => onSelect(item.projectId, checked)}
                  label={`${item.title} 선택`}
                />
              </td>
              <td>
                <RoleBadge role={item.myRole} />
              </td>
              <td className={styles.titleCell}>
                <Link to={path} onClick={(e) => e.stopPropagation()}>
                  {item.title}
                </Link>
              </td>
              <td>
                <span className={`${styles.score} ${met ? styles.met : styles.unmet}`}>
                  {item.completenessScore}점 · {met ? '충족' : '불충족'}
                </span>
              </td>
              <td>
                <StatusBadge {...getDdayBadge(item.deadline, item.status)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default HandoverTable;
