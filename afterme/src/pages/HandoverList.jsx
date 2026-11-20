import React from 'react';
import Button from '../components/Button';
import Tag from '../components/Tag';

function HandoverList() {
  return (
    <div>
      <Button text="초대 코드 입력" variant="white" onClick={() => console.log('클릭')} />
      <Button text="인수인계 생성" variant="primary" />

      <Tag text="전체" variant="active" />
      <Tag text="전임자" variant="inactive" />
      <Tag text="후임자" variant="outline" />
    </div>
  )
}

export default HandoverList;