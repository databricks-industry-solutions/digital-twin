import styled from 'styled-components';

const StyledInput = styled.input`
  width: 240px;
  padding: 8px 12px;
  font-size: 15px;
  border: 1px solid #d6d6d6;
  border-radius: 6px;
  background: #fafbfc;
  color: #333;
  transition: border 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 0 0 transparent;
  outline: none;

  &:hover {
    border: 1px solid #bbbbbb;
    background: #f3f4f6;
  }

  &:focus {
    border: 1.5px solid #009fe3;
    box-shadow: 0 0 0 2px #b7e3fa;
    background: #fff;
  }
`;

function TimestampInput({ handleTimestampSelection }) {
  return (
    <StyledInput
      onChange={handleTimestampSelection}
      type='datetime-local'
      placeholder='timestamp'
    />
  );
}

export default TimestampInput;