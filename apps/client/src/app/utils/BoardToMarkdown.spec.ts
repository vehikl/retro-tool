import {BoardToMarkdown} from "./BoardToMarkdown";
import {QueryClient} from "@tanstack/react-query";
import {ActionItem, Board} from "@prisma/client";


jest.mock("@tanstack/react-query");

describe("BoardToMarkdown", () => {
  it("will add action items when building markdown", () => {
    const board: Board = {
      id: 'a98sduf9as8udf98jas9df8u',
      title: "New Board",
      createdAt: new Date(),
      ownerId: "",
      settings: null,
      inviteCode: null,
      timer: null,
      deleted: null
    }
    const actionItem: ActionItem = {
      id: "sa09fipo324fo8sdu9fu8sd",
      value: "I am an action item!",
      complete: false,
      createdAt: new Date(),
      boardId: board.id
    }

    const queryClient = new QueryClient();
    (queryClient.getQueryData as jest.Mock)
      .mockImplementationOnce(() => board)
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [actionItem])

    const result = (new BoardToMarkdown(queryClient, board.id)).build();

    expect(result).toContain(actionItem.value);
    expect(queryClient.getQueryData).toHaveBeenCalledWith(['actionItems', { boardId: board.id }])
  });
})
