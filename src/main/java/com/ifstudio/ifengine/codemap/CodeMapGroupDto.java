package com.ifstudio.ifengine.codemap;

/** 코드매핑 그룹 요약 (목록 화면용). */
public class CodeMapGroupDto {
    public String groupId;
    public long count;

    public CodeMapGroupDto(String groupId, long count) {
        this.groupId = groupId;
        this.count = count;
    }
}
